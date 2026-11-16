import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import app as app_module


class SmartParkAPITests(unittest.TestCase):

    def setUp(self):
        # Create a temporary database for testing
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temp_dir.name) / "test_smartpark.db"

        connection = sqlite3.connect(self.database_path)

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
        """)

        connection.execute("""
            INSERT INTO parking_decks VALUES (
                'D01', 'Main Deck', 'Campus',
                100, 60, 40, 60.0, 'Available',
                '2026-11-14', 1, 'Simulated', 'Online'
            )
        """)

        connection.executemany("""
            INSERT INTO parking_spots
            (spot_id, deck_id, level, section, occupied)
            VALUES (?, ?, ?, ?, ?)
        """, [
            ('D01-01', 'D01', 1, 'A', 0),
            ('D01-02', 'D01', 1, 'A', 1)
        ])

        connection.commit()
        connection.close()

        # Point the API to the temporary test database
        self.database_patch = patch.object(
            app_module, "DATABASE_PATH", self.database_path
        )
        self.database_patch.start()

        app_module.app.config["TESTING"] = True
        self.client = app_module.app.test_client()

    def tearDown(self):
        self.database_patch.stop()
        self.temp_dir.cleanup()

    def test_health_endpoint(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {"message": "SmartPark API is running!"}
        )

    def test_get_parking_decks(self):
        response = self.client.get("/api/decks")

        self.assertEqual(response.status_code, 200)

        decks = response.get_json()

        self.assertEqual(len(decks), 1)
        self.assertEqual(decks[0]["name"], "Main Deck")
        self.assertEqual(decks[0]["availableSpaces"], 40)

    def test_get_all_parking_spots(self):
        response = self.client.get("/api/spots")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.get_json()), 2)

    def test_filter_spots_by_deck(self):
        response = self.client.get("/api/spots?deckId=D01")

        self.assertEqual(response.status_code, 200)

        spots = response.get_json()

        self.assertEqual(len(spots), 2)
        self.assertTrue(
            all(spot["deck_id"] == "D01" for spot in spots)
        )


if __name__ == "__main__":
    unittest.main()
