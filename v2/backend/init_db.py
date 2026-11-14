
import csv
import sqlite3
from pathlib import Path

# Find the v2 project folder
BASE_DIR = Path(__file__).resolve().parent.parent

# Database and CSV file locations
DATABASE_DIR = BASE_DIR / "database"
DATABASE_PATH = DATABASE_DIR / "smartpark.db"

PARKING_CSV = BASE_DIR / "public" / "data" / "parking.csv"
SPOTS_CSV = BASE_DIR / "public" / "data" / "spots.csv"


def to_bool(value):
    return value.strip().lower() == "true"


def initialize_database():
    # Make the database folder if it doesn't exist
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)

    # Check that both CSV files exist
    if not PARKING_CSV.exists() or not SPOTS_CSV.exists():
        raise FileNotFoundError("Could not find the parking CSV files.")

    connection = sqlite3.connect(DATABASE_PATH)

    try:
        connection.execute("PRAGMA foreign_keys = ON")

        with connection:
            # Create the parking decks table
            connection.execute("""
                CREATE TABLE IF NOT EXISTS parking_decks (
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
                )
            """)

            # Create the individual parking spots table
            connection.execute("""
                CREATE TABLE IF NOT EXISTS parking_spots (
                    spot_id TEXT PRIMARY KEY,
                    deck_id TEXT NOT NULL,
                    level INTEGER,
                    section TEXT,
                    occupied INTEGER NOT NULL,
                    FOREIGN KEY (deck_id)
                        REFERENCES parking_decks(id)
                )
            """)

            # Import parking deck information
            with open(PARKING_CSV, newline="", encoding="utf-8") as file:
                reader = csv.DictReader(file)

                for row in reader:
                    connection.execute("""
                        INSERT INTO parking_decks VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                        )
                        ON CONFLICT(id) DO UPDATE SET
                            name = excluded.name,
                            location = excluded.location,
                            total_capacity = excluded.total_capacity,
                            occupied_spaces = excluded.occupied_spaces,
                            available_spaces = excluded.available_spaces,
                            occupancy = excluded.occupancy,
                            status = excluded.status,
                            last_updated = excluded.last_updated,
                            is_data_available = excluded.is_data_available,
                            data_type = excluded.data_type,
                            sensor_status = excluded.sensor_status
                    """, (
                        row["id"],
                        row["name"],
                        row["location"],
                        int(row["totalCapacity"]),
                        int(row["occupiedSpaces"]),
                        int(row["availableSpaces"]),
                        float(row["occupancy"]),
                        row["status"],
                        row["lastUpdated"],
                        int(to_bool(row["isDataAvailable"])),
                        row["dataType"],
                        row["sensorStatus"]
                    ))

            # Import individual parking spots
            with open(SPOTS_CSV, newline="", encoding="utf-8") as file:
                reader = csv.DictReader(file)

                for row in reader:
                    connection.execute("""
                        INSERT INTO parking_spots
                            (spot_id, deck_id, level, section, occupied)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT(spot_id) DO UPDATE SET
                            deck_id = excluded.deck_id,
                            level = excluded.level,
                            section = excluded.section,
                            occupied = excluded.occupied
                    """, (
                        row["spotId"],
                        row["deckId"],
                        int(row["level"]),
                        row["section"],
                        int(to_bool(row["occupied"]))
                    ))

        deck_count = connection.execute(
            "SELECT COUNT(*) FROM parking_decks"
        ).fetchone()[0]

        spot_count = connection.execute(
            "SELECT COUNT(*) FROM parking_spots"
        ).fetchone()[0]

        print("SmartPark database initialized successfully!")
        print(f"Parking decks imported: {deck_count}")
        print(f"Parking spots imported: {spot_count}")
        print(f"Database location: {DATABASE_PATH}")

    finally:
        connection.close()


if __name__ == "__main__":
    initialize_database()