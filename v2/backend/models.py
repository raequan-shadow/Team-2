from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, REAL, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class ParkingDeck(Base):
    __tablename__ = "parking_decks"

    id: Mapped[str] = mapped_column(Text, primary_key=True, nullable=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    occupied_spaces: Mapped[int | None] = mapped_column(Integer, nullable=True)
    available_spaces: Mapped[int | None] = mapped_column(Integer, nullable=True)
    occupancy: Mapped[float | None] = mapped_column(REAL, nullable=True)
    status: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_updated: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_data_available: Mapped[int | None] = mapped_column(Integer, nullable=True)
    data_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    sensor_status: Mapped[str | None] = mapped_column(Text, nullable=True)

    spots: Mapped[list[ParkingSpot]] = relationship(back_populates="deck")


class ParkingSpot(Base):
    __tablename__ = "parking_spots"

    #spot_id: Mapped[str] = mapped_column(Text, primary_key=True, nullable=True)
    #deck_id: Mapped[str] = mapped_column(
        #Text,
        #ForeignKey("parking_decks.id"),
        #nullable=False,
    #)

    spot_id: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False)
    deck_id: Mapped[str] = mapped_column(Text, ForeignKey("parking_decks.id"),
                                         primary_key=True, nullable=False)


    level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section: Mapped[str | None] = mapped_column(Text, nullable=True)
    occupied: Mapped[int] = mapped_column(Integer, nullable=False)

    deck: Mapped[ParkingDeck] = relationship(back_populates="spots")
