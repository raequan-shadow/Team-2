
import csv
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.engine import Connection

from config import BASE_DIR, DATABASE_PATH
from database import create_database_engine
from models import Base, ParkingDeck, ParkingSpot

PARKING_CSV = BASE_DIR / "public" / "data" / "parking.csv"
SPOTS_CSV = BASE_DIR / "public" / "data" / "spots.csv"


def to_bool(value):
    return value.strip().lower() == "true"


def initialize_database(database_path: Path | None = None):
    resolved_database_path = database_path or DATABASE_PATH
    resolved_database_path.parent.mkdir(parents=True, exist_ok=True)

    if not PARKING_CSV.exists() or not SPOTS_CSV.exists():
        raise FileNotFoundError("Could not find the parking CSV files.")

    engine = create_database_engine(resolved_database_path, allow_create=True)

    try:
        with engine.begin() as connection:
            Base.metadata.create_all(connection)
            _import_decks(connection)
            _import_spots(connection)
            deck_count = connection.scalar(
                select(func.count()).select_from(ParkingDeck)
            )
            spot_count = connection.scalar(
                select(func.count()).select_from(ParkingSpot)
            )

        print("SmartPark database initialized successfully!")
        print(f"Parking decks imported: {deck_count}")
        print(f"Parking spots imported: {spot_count}")
        print(f"Database location: {resolved_database_path}")

    finally:
        engine.dispose()


def _import_decks(connection: Connection) -> None:
    deck_columns = (
        "name",
        "location",
        "total_capacity",
        "occupied_spaces",
        "available_spaces",
        "occupancy",
        "status",
        "last_updated",
        "is_data_available",
        "data_type",
        "sensor_status",
    )
    deck_insert = insert(ParkingDeck)
    upsert = deck_insert.on_conflict_do_update(
        index_elements=[ParkingDeck.id],
        set_={column: getattr(deck_insert.excluded, column)
              for column in deck_columns},
    )

    with open(PARKING_CSV, newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            connection.execute(upsert, {
                "id": row["id"],
                "name": row["name"],
                "location": row["location"],
                "total_capacity": int(row["totalCapacity"]),
                "occupied_spaces": int(row["occupiedSpaces"]),
                "available_spaces": int(row["availableSpaces"]),
                "occupancy": float(row["occupancy"]),
                "status": row["status"],
                "last_updated": row["lastUpdated"],
                "is_data_available": int(to_bool(row["isDataAvailable"])),
                "data_type": row["dataType"],
                "sensor_status": row["sensorStatus"],
            })


def _import_spots(connection: Connection) -> None:
    spot_columns = ("deck_id", "level", "section", "occupied")
    spot_insert = insert(ParkingSpot)
    upsert = spot_insert.on_conflict_do_update(
        index_elements=[ParkingSpot.spot_id],
        set_={column: getattr(spot_insert.excluded, column)
              for column in spot_columns},
    )

    with open(SPOTS_CSV, newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            connection.execute(upsert, {
                "spot_id": row["spotId"],
                "deck_id": row["deckId"],
                "level": int(row["level"]),
                "section": row["section"],
                "occupied": int(to_bool(row["occupied"])),
            })


if __name__ == "__main__":
    initialize_database()