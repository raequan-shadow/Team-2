"""Demo-only occupancy simulator.

The frontend no longer invents occupancy numbers. For demos, run this script
to change occupancy in the SQLite database instead, so every browser session
reads the same values from the Flask API. Updated decks are marked with
data_type = "simulated" so they are never confused with real sensor data.

Usage (from v2/backend):
    python simulate_occupancy.py                 # one update
    python simulate_occupancy.py --loop          # update every 30 seconds
    python simulate_occupancy.py --loop --spots  # also flip individual spots
"""
import argparse
import random
import time
from datetime import datetime

from sqlalchemy import select

from models import ParkingDeck, ParkingSpot

SIMULATED = "simulated"
MAX_CHANGE = 10       # Most cars entering or leaving a deck per update.
DECK_CHANGE_RATE = 0.75  # Chance that a deck changes on an update.
SPOT_FLIP_RATE = 0.1     # Chance that a spot flips when --spots is used.


def deck_status(available, capacity):
    """Same thresholds the frontend uses for Green / Yellow / Red."""
    if capacity <= 0:
        return "Unavailable"
    ratio = available / capacity
    if ratio >= 0.2:
        return "Green"
    if ratio >= 0.05:
        return "Yellow"
    return "Red"


def set_deck_occupancy(deck, occupied, timestamp):
    """Store a new occupied count and keep the derived columns consistent."""
    capacity = deck.total_capacity or 0
    occupied = max(0, min(capacity, occupied))
    available = capacity - occupied
    deck.occupied_spaces = occupied
    deck.available_spaces = available
    deck.occupancy = round(100 * occupied / capacity, 2) if capacity else 0.0
    deck.status = deck_status(available, capacity)
    deck.last_updated = timestamp
    deck.data_type = SIMULATED


def simulate_tick(session, rng=random, include_spots=False):
    """Apply one round of simulated changes. Returns (decks_changed, spots_changed)."""
    timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
    decks_changed = 0
    for deck in session.scalars(select(ParkingDeck)).all():
        # Decks without data, or whose sensors are stale/offline, stop reporting.
        reporting = (
            deck.is_data_available
            and deck.occupied_spaces is not None
            and deck.total_capacity
            and (deck.sensor_status or "online") == "online"
        )
        if not reporting or rng.random() > DECK_CHANGE_RATE:
            continue
        delta = rng.randint(-MAX_CHANGE, MAX_CHANGE)
        set_deck_occupancy(deck, deck.occupied_spaces + delta, timestamp)
        decks_changed += 1

    spots_changed = 0
    if include_spots:
        for spot in session.scalars(select(ParkingSpot)).all():
            if rng.random() < SPOT_FLIP_RATE:
                spot.occupied = 0 if spot.occupied else 1
                spots_changed += 1

    session.commit()
    return decks_changed, spots_changed


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--loop", action="store_true", help="keep updating until stopped")
    parser.add_argument("--interval", type=float, default=30, help="seconds between updates (default 30)")
    parser.add_argument("--spots", action="store_true", help="also flip individual parking spots")
    args = parser.parse_args()

    from database import SessionLocal  # Imported here so tests can use their own database.

    while True:
        with SessionLocal() as session:
            decks, spots = simulate_tick(session, include_spots=args.spots)
        print(f"Simulated update: {decks} deck(s), {spots} spot(s) changed")
        if not args.loop:
            break
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
