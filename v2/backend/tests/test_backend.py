import csv
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import func, inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

import app
import init_db
from database import create_database_engine
from models import Base, ParkingDeck, ParkingSpot


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp_dir.name)
        self.database_path = self.directory / "smartpark-test.db"
        self.engine = create_database_engine(
            self.database_path,
            allow_create=True,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(
            bind=self.engine,
            expire_on_commit=False,
        )
        self.session_local_patch = patch.object(
            app,
            "SessionLocal",
            self.session_factory,
        )
        self.session_local_patch.start()
        self.client = app.app.test_client()

    def tearDown(self):
        self.session_local_patch.stop()
        self.engine.dispose()
        self.temp_dir.cleanup()

    def add_sample_data(self):
        with self.session_factory() as session:
            session.add_all([
                ParkingDeck(
                    id="D01",
                    name="Main Deck",
                    location="Main campus",
                    total_capacity=300,
                    occupied_spaces=45,
                    available_spaces=255,
                    occupancy=15.0,
                    status="Green",
                    last_updated="2026-11-05T13:24:11-05:00",
                    is_data_available=1,
                    data_type="demo",
                    sensor_status="online",
                ),
                ParkingDeck(
                    id="D02",
                    name="Union Deck",
                    location="Near Student Union",
                    total_capacity=1200,
                    occupied_spaces=1180,
                    available_spaces=20,
                    occupancy=98.33,
                    status="Red",
                    last_updated="2026-11-05T13:24:11-05:00",
                    is_data_available=0,
                    data_type="demo",
                    sensor_status="offline",
                ),
                ParkingSpot(
                    spot_id="1A-01",
                    deck_id="D01",
                    level=1,
                    section="A",
                    occupied=1,
                ),
                ParkingSpot(
                    spot_id="1A-02",
                    deck_id="D01",
                    level=1,
                    section="A",
                    occupied=0,
                ),
            ])
            session.commit()

    def test_api_reads_preserve_existing_response_shapes(self):
        self.add_sample_data()

        decks_response = self.client.get("/api/decks")
        self.assertEqual(decks_response.status_code, 200)
        decks = decks_response.get_json()
        self.assertEqual([deck["id"] for deck in decks], ["D01", "D02"])
        self.assertEqual(decks[0]["totalCapacity"], 300)
        self.assertEqual(decks[0]["occupiedSpaces"], 45)
        self.assertEqual(decks[0]["isDataAvailable"], True)
        self.assertEqual(decks[1]["occupiedSpaces"], None)
        self.assertEqual(
            set(decks[0]),
            {
                "id",
                "name",
                "location",
                "totalCapacity",
                "occupiedSpaces",
                "availableSpaces",
                "occupancy",
                "status",
                "lastUpdated",
                "isDataAvailable",
                "dataType",
                "sensorStatus",
            },
        )

        spots_response = self.client.get("/api/spots?deckId=D01")
        self.assertEqual(spots_response.status_code, 200)
        self.assertEqual(
            [spot["spot_id"] for spot in spots_response.get_json()],
            ["1A-01", "1A-02"],
        )
        self.assertEqual(
            self.client.get("/api/spots?deckId=missing").get_json(),
            [],
        )
        self.assertEqual(
            self.client.get("/api/health").get_json(),
            {
                "message": "SmartPark API is running!",
                "database": "connected",
                "status": "healthy",
            },
        )

    def test_orm_writes_persist_after_reopening_database(self):
        self.add_sample_data()
        self.engine.dispose()

        reopened_engine = create_database_engine(self.database_path)
        try:
            reopened_sessions = sessionmaker(bind=reopened_engine)
            with reopened_sessions() as session:
                deck = session.get(ParkingDeck, "D01")
                spot = session.get(ParkingSpot, "1A-01")
                self.assertEqual(deck.name, "Main Deck")
                self.assertEqual(spot.deck_id, deck.id)
                self.assertEqual(spot.deck.name, "Main Deck")
                self.assertEqual(len(deck.spots), 2)
        finally:
            reopened_engine.dispose()

    def test_model_metadata_matches_existing_sqlite_schema(self):
        inspector = inspect(self.engine)
        deck_columns = inspector.get_columns("parking_decks")
        spot_columns = inspector.get_columns("parking_spots")

        self.assertEqual(
            [(column["name"], str(column["type"]).upper()) for column in deck_columns],
            [
                ("id", "TEXT"),
                ("name", "TEXT"),
                ("location", "TEXT"),
                ("total_capacity", "INTEGER"),
                ("occupied_spaces", "INTEGER"),
                ("available_spaces", "INTEGER"),
                ("occupancy", "REAL"),
                ("status", "TEXT"),
                ("last_updated", "TEXT"),
                ("is_data_available", "INTEGER"),
                ("data_type", "TEXT"),
                ("sensor_status", "TEXT"),
            ],
        )
        self.assertEqual(
            [(column["name"], str(column["type"]).upper()) for column in spot_columns],
            [
                ("spot_id", "TEXT"),
                ("deck_id", "TEXT"),
                ("level", "INTEGER"),
                ("section", "TEXT"),
                ("occupied", "INTEGER"),
            ],
        )
        self.assertEqual(
            [column["nullable"] for column in deck_columns],
            [True, False, True, True, True, True, True, True, True, True, True, True],
        )
        self.assertEqual(
            [column["nullable"] for column in spot_columns],
            [True, False, True, True, False],
        )
        self.assertEqual(inspector.get_pk_constraint("parking_decks")["constrained_columns"], ["id"])
        self.assertEqual(inspector.get_pk_constraint("parking_spots")["constrained_columns"], ["spot_id"])
        self.assertEqual(
            inspector.get_foreign_keys("parking_spots")[0]["constrained_columns"],
            ["deck_id"],
        )
        self.assertEqual(
            inspector.get_foreign_keys("parking_spots")[0]["referred_columns"],
            ["id"],
        )

    def test_existing_sqlite_schema_and_data_are_preserved(self):
        existing_path = self.directory / "existing.db"
        with closing(sqlite3.connect(existing_path)) as connection:
            connection.executescript("""
                CREATE TABLE parking_decks (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    location TEXT,
                    total_capacity INTEGER,
                    occupied_spaces INTEGER,
                    available_spaces INTEGER,
                    occupancy REAL,
                    status TEXT,
                    last_updated TEXT,
                    is_data_available INTEGER,
                    data_type TEXT,
                    sensor_status TEXT
                );
                CREATE TABLE parking_spots (
                    spot_id TEXT PRIMARY KEY,
                    deck_id TEXT NOT NULL,
                    level INTEGER,
                    section TEXT,
                    occupied INTEGER NOT NULL,
                    FOREIGN KEY (deck_id) REFERENCES parking_decks(id)
                );
                INSERT INTO parking_decks VALUES (
                    'D01', 'Existing Deck', 'Campus', 100, 25, 75, 25.0,
                    'Green', '2026-11-05T13:24:11-05:00', 1, 'demo', 'online'
                );
                INSERT INTO parking_spots VALUES ('1A-01', 'D01', 1, 'A', 1);
            """)
            original_schema = connection.execute(
                "SELECT name, sql FROM sqlite_master "
                "WHERE type = 'table' AND name IN "
                "('parking_decks', 'parking_spots') ORDER BY name"
            ).fetchall()

        existing_engine = create_database_engine(existing_path)
        try:
            Base.metadata.create_all(existing_engine)
            with closing(sqlite3.connect(existing_path)) as connection:
                updated_schema = connection.execute(
                    "SELECT name, sql FROM sqlite_master "
                    "WHERE type = 'table' AND name IN "
                    "('parking_decks', 'parking_spots') ORDER BY name"
                ).fetchall()
            self.assertEqual(updated_schema, original_schema)

            existing_sessions = sessionmaker(bind=existing_engine)
            with patch.object(app, "SessionLocal", existing_sessions):
                response = self.client.get("/api/decks")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json()[0]["name"], "Existing Deck")
            with existing_sessions() as session:
                self.assertEqual(session.get(ParkingSpot, "1A-01").deck_id, "D01")
        finally:
            existing_engine.dispose()

    def test_csv_initialization_upserts_without_duplicate_rows(self):
        parking_csv, spots_csv = self.write_csv_files(
            [
                self.deck_row("D01", "Main Deck"),
            ],
            [
                self.spot_row("1A-01", "D01", "A", "true"),
            ],
        )
        with patch.object(init_db, "PARKING_CSV", parking_csv), patch.object(
            init_db,
            "SPOTS_CSV",
            spots_csv,
        ):
            init_db.initialize_database(self.database_path)

            parking_csv, spots_csv = self.write_csv_files(
                [
                    self.deck_row("D01", "Updated Main Deck"),
                ],
                [
                    self.spot_row("1A-01", "D01", "B", "false"),
                ],
            )
            init_db.initialize_database(self.database_path)

        with self.session_factory() as session:
            deck = session.get(ParkingDeck, "D01")
            spot = session.get(ParkingSpot, "1A-01")
            self.assertEqual(deck.name, "Updated Main Deck")
            self.assertEqual(spot.section, "B")
            self.assertEqual(spot.occupied, 0)
            self.assertEqual(
                session.scalar(select(func.count()).select_from(ParkingDeck)),
                1,
            )
            self.assertEqual(
                session.scalar(select(func.count()).select_from(ParkingSpot)),
                1,
            )

    def test_invalid_csv_input_rolls_back_prior_upserts(self):
        initial_parking, spots_csv = self.write_csv_files(
            [self.deck_row("D01", "Original Deck")],
            [self.spot_row("1A-01", "D01", "A", "true")],
        )
        with patch.object(init_db, "PARKING_CSV", initial_parking), patch.object(
            init_db,
            "SPOTS_CSV",
            spots_csv,
        ):
            init_db.initialize_database(self.database_path)

            invalid_parking, _ = self.write_csv_files(
                [
                    self.deck_row("D01", "Changed Deck"),
                    self.deck_row("D02", "Invalid Deck", total_capacity="not-a-number"),
                ],
                [self.spot_row("1A-01", "D01", "B", "false")],
            )
            with patch.object(init_db, "PARKING_CSV", invalid_parking):
                with self.assertRaises(ValueError):
                    init_db.initialize_database(self.database_path)

        with self.session_factory() as session:
            self.assertEqual(session.get(ParkingDeck, "D01").name, "Original Deck")
            self.assertIsNone(session.get(ParkingDeck, "D02"))
            self.assertEqual(session.get(ParkingSpot, "1A-01").section, "A")

    def test_invalid_foreign_key_write_is_rejected(self):
        with self.session_factory() as session:
            session.add(ParkingSpot(
                spot_id="orphan",
                deck_id="missing-deck",
                level=1,
                section="A",
                occupied=0,
            ))
            with self.assertRaises(IntegrityError):
                session.commit()
            session.rollback()

    def test_missing_database_returns_503_without_creating_file(self):
        missing_path = self.directory / "not-created.db"
        missing_engine = create_database_engine(missing_path)
        missing_sessions = sessionmaker(bind=missing_engine)
        try:
            with patch.object(app, "SessionLocal", missing_sessions):
                response = self.client.get("/api/decks")
            self.assertEqual(response.status_code, 503)
            self.assertEqual(
                response.get_json(),
                {
                    "error": "Database unavailable",
                    "message": "Unable to access parking data.",
                },
            )
            self.assertFalse(missing_path.exists())
        finally:
            missing_engine.dispose()

    def write_csv_files(self, deck_rows, spot_rows):
        parking_path = self.directory / "parking.csv"
        spots_path = self.directory / "spots.csv"

        parking_fields = [
            "id",
            "name",
            "location",
            "totalCapacity",
            "occupiedSpaces",
            "availableSpaces",
            "occupancy",
            "status",
            "lastUpdated",
            "isDataAvailable",
            "dataType",
            "sensorStatus",
        ]
        spot_fields = ["deckId", "level", "section", "spotId", "occupied"]

        with parking_path.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=parking_fields)
            writer.writeheader()
            writer.writerows(deck_rows)

        with spots_path.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=spot_fields)
            writer.writeheader()
            writer.writerows(spot_rows)

        return parking_path, spots_path

    @staticmethod
    def deck_row(deck_id, name, total_capacity="100"):
        return {
            "id": deck_id,
            "name": name,
            "location": "Campus",
            "totalCapacity": total_capacity,
            "occupiedSpaces": "25",
            "availableSpaces": "75",
            "occupancy": "25.0",
            "status": "Green",
            "lastUpdated": "2026-11-05T13:24:11-05:00",
            "isDataAvailable": "true",
            "dataType": "demo",
            "sensorStatus": "online",
        }

    @staticmethod
    def spot_row(spot_id, deck_id, section, occupied):
        return {
            "deckId": deck_id,
            "level": "1",
            "section": section,
            "spotId": spot_id,
            "occupied": occupied,
        }


if __name__ == "__main__":
    unittest.main()
