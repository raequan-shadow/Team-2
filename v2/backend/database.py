from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import URL, Engine
from sqlalchemy.orm import sessionmaker

from config import DATABASE_PATH


def create_database_engine(
    database_path: Path,
    *,
    allow_create: bool = False,
) -> Engine:
    resolved_path = database_path.resolve()

    if allow_create:
        url = URL.create(
            "sqlite+pysqlite",
            database=str(resolved_path),
        )
    else:
        url = URL.create(
            "sqlite+pysqlite",
            database=resolved_path.as_uri(),
            query={"mode": "rw", "uri": "true"},
        )

    engine = create_engine(url)

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


engine = create_database_engine(DATABASE_PATH)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
