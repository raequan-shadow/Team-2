import random
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy.orm import sessionmaker

import app
from database import create_database_engine
from models import Base, ParkingDeck, ParkingSpot
from simulate_occupancy import SIMULATED, deck_status, simulate_tick


def make_deck(deck_id, occupied=100, capacity=200, available=1, sensor="online"):
    return ParkingDeck(
        id=deck_id,
        name=f"Deck {deck_id}",
        location="Campus",
        total_capacity=capacity,
        occupied_spaces=occupied,
        available_spaces=capacity - occupied,
        occupancy=round(100 * occupied / capacity, 2),
        status="Green",
        last_updated="2026-11-05T13:24:11-05:00",
        is_data_available=available,
        data_type="demo",
        sensor_status=sensor,
    )


class FixedRandom:
    """Always rolls `roll` and always picks `delta` cars."""

    def __init__(self, roll, delta):
        self.roll = roll
        self.delta = delta

    def random(self):
        return self.roll

    def randint(self, _low, _high):
        return self.delta


class CentralizedOccupancyTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.engine = create_database_engine(
            Path(self.temp_dir.name) / "occupancy-test.db",
            allow_create=True,
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.session_patch = patch.object(app, "SessionLocal", self.Session)
        self.session_patch.start()
        self.client = app.app.test_client()

    def tearDown(self):
        self.session_patch.stop()
        self.engine.dispose()
        self.temp_dir.cleanup()

    def add(self, *rows):
        with self.Session() as session:
            session.add_all(rows)
            session.commit()

    def tick(self, rng, include_spots=False):
        with self.Session() as session:
            return simulate_tick(session, rng=rng, include_spots=include_spots)

    def deck(self, deck_id):
        with self.Session() as session:
            return session.get(ParkingDeck, deck_id)

    def test_api_responses_are_never_cached(self):
        self.add(make_deck("D01"))
        for path in ("/api/decks", "/api/spots", "/api/health"):
            self.assertEqual(self.client.get(path).headers["Cache-Control"], "no-store")

    def test_simulated_update_is_saved_and_visible_to_every_client(self):
        self.add(make_deck("D01", occupied=100))
        first_browser = self.client
        second_browser = app.app.test_client()

        self.tick(FixedRandom(roll=0.1, delta=7))

        for browser in (first_browser, second_browser):
            [deck] = browser.get("/api/decks").get_json()
            self.assertEqual(deck["occupiedSpaces"], 107)
            self.assertEqual(deck["availableSpaces"], 93)
            self.assertEqual(deck["dataType"], SIMULATED)

    def test_simulated_update_keeps_derived_columns_consistent(self):
        self.add(make_deck("D01", occupied=180, capacity=200))
        self.tick(FixedRandom(roll=0.1, delta=10))
        deck = self.deck("D01")
        self.assertEqual(deck.occupied_spaces, 190)
        self.assertEqual(deck.available_spaces, 10)
        self.assertEqual(deck.occupancy, 95.0)
        self.assertEqual(deck.status, "Yellow")
        self.assertNotEqual(deck.last_updated, "2026-11-05T13:24:11-05:00")

    def test_occupancy_stays_between_zero_and_capacity(self):
        self.add(make_deck("LOW", occupied=3))
        self.tick(FixedRandom(roll=0.1, delta=-10))
        self.assertEqual(self.deck("LOW").occupied_spaces, 0)
        self.add(make_deck("HIGH", occupied=198))
        self.tick(FixedRandom(roll=0.1, delta=10))
        self.assertEqual(self.deck("HIGH").occupied_spaces, 200)
        self.assertEqual(self.deck("HIGH").available_spaces, 0)

    def test_stale_offline_and_missing_decks_are_left_alone(self):
        self.add(
            make_deck("STALE", sensor="stale"),
            make_deck("OFFLINE", sensor="offline"),
            make_deck("NODATA", available=0),
        )
        decks_changed, _ = self.tick(FixedRandom(roll=0.1, delta=5))
        self.assertEqual(decks_changed, 0)
        for deck_id in ("STALE", "OFFLINE", "NODATA"):
            deck = self.deck(deck_id)
            self.assertEqual(deck.occupied_spaces, 100)
            self.assertEqual(deck.data_type, "demo")

    def test_spots_only_change_when_requested(self):
        self.add(
            make_deck("D01"),
            ParkingSpot(spot_id="1A-01", deck_id="D01", level=1, section="A", occupied=0),
        )
        self.tick(FixedRandom(roll=0.0, delta=0))
        self.assertEqual(self.client.get("/api/spots").get_json()[0]["occupied"], 0)
        _, spots_changed = self.tick(FixedRandom(roll=0.0, delta=0), include_spots=True)
        self.assertEqual(spots_changed, 1)
        self.assertEqual(self.client.get("/api/spots").get_json()[0]["occupied"], 1)

    def test_random_ticks_never_break_capacity_limits(self):
        self.add(make_deck("D01", occupied=5, capacity=20))
        rng = random.Random(42)
        for _ in range(200):
            self.tick(rng)
            deck = self.deck("D01")
            self.assertTrue(0 <= deck.occupied_spaces <= 20)
            self.assertEqual(deck.occupied_spaces + deck.available_spaces, 20)

    def test_deck_status_matches_frontend_thresholds(self):
        self.assertEqual(deck_status(40, 200), "Green")
        self.assertEqual(deck_status(39, 200), "Yellow")
        self.assertEqual(deck_status(10, 200), "Yellow")
        self.assertEqual(deck_status(9, 200), "Red")
        self.assertEqual(deck_status(0, 0), "Unavailable")


if __name__ == "__main__":
    unittest.main()
