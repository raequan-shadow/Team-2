from database import engine
from models import ParkingSession


def migrate_sessions():
    ParkingSession.__table__.create(
        bind=engine,
        checkfirst=True,
    )
    print("Parking sessions table is ready.")


if __name__ == "__main__":
    migrate_sessions()