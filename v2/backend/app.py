from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from database import SessionLocal
from models import ParkingDeck, ParkingSpot

app = Flask(__name__)

CORS(app, origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173"
])

# Occupancy changes constantly, so browsers must always ask the API for fresh data.
@app.after_request
def disable_api_caching(response):
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


# Handle database errors across the API
@app.errorhandler(SQLAlchemyError)
def handle_database_error(error):
    app.logger.error("Database error: %s", error)

    return jsonify({
        "error": "Database unavailable",
        "message": "Unable to access parking data."
    }), 503


@app.route("/api/health", methods=["GET"])
def health():
    with SessionLocal() as session:
        session.execute(select(1).select_from(ParkingDeck).limit(1)).first()
        session.execute(select(1).select_from(ParkingSpot).limit(1)).first()

    return jsonify({
        "message": "SmartPark API is running!",
        "database": "connected",
        "status": "healthy"
    }), 200


@app.route("/api/decks", methods=["GET"])
def get_decks():
    with SessionLocal() as session:
        decks = session.scalars(
            select(ParkingDeck).order_by(ParkingDeck.id)
        ).all()

        payload = [
            {
                "id": deck.id,
                "name": deck.name,
                "location": deck.location,
                "totalCapacity": deck.total_capacity,
                "occupiedSpaces": (
                    deck.occupied_spaces
                    if deck.is_data_available
                    else None
                ),
                "availableSpaces": deck.available_spaces,
                "occupancy": deck.occupancy,
                "status": deck.status,
                "lastUpdated": deck.last_updated,
                "isDataAvailable": bool(deck.is_data_available),
                "dataType": deck.data_type,
                "sensorStatus": deck.sensor_status,
            }
            for deck in decks
        ]

    return jsonify(payload)


@app.route("/api/spots", methods=["GET"])
def get_spots():
    deck_id = request.args.get("deckId")
    statement = select(ParkingSpot)
    if deck_id:
        statement = statement.where(ParkingSpot.deck_id == deck_id).order_by(
            ParkingSpot.level,
            ParkingSpot.section,
            ParkingSpot.spot_id,
        )
    else:
        statement = statement.order_by(
            ParkingSpot.deck_id,
            ParkingSpot.level,
            ParkingSpot.section,
            ParkingSpot.spot_id,
        )

    with SessionLocal() as session:
        spots = session.scalars(statement).all()

    return jsonify([
        {
            "spot_id": spot.spot_id,
            "deck_id": spot.deck_id,
            "level": spot.level,
            "section": spot.section,
            "occupied": spot.occupied,
        }
        for spot in spots
    ])


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
