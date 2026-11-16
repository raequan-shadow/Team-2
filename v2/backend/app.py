from config import DATABASE_PATH
from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

#from pathlib import Path


app = Flask(__name__)

CORS(app, origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173"
])

#BASE_DIR = Path(__file__).resolve().parent.parent
#DATABASE_PATH = BASE_DIR / "database" / "smartpark.db"


#def get_db_connection():
    #connection = sqlite3.connect(DATABASE_PATH)
    #connection.row_factory = sqlite3.Row
    #return connection

def get_db_connection():
    # Connect to an existing database without creating a new one
    connection = sqlite3.connect(
        DATABASE_PATH.as_uri() + "?mode=rw",
        uri=True
    )
    connection.row_factory = sqlite3.Row
    return connection

# Handle database errors across the API
@app.errorhandler(sqlite3.Error)
def handle_database_error(error):
    app.logger.error("Database error: %s", error)

    return jsonify({
        "error": "Database unavailable",
        "message": "Unable to access parking data."
    }), 503


#@app.route("/api/health", methods=["GET"])
#def health():
    #return jsonify({"message": "SmartPark API is running!"})

@app.route("/api/health", methods=["GET"])

def health():
    connection = get_db_connection()

    try:
        # Verify that both required database tables are accessible
        connection.execute(
            "SELECT 1 FROM parking_decks LIMIT 1"
        ).fetchone()

        connection.execute(
            "SELECT 1 FROM parking_spots LIMIT 1"
        ).fetchone()

        return jsonify({
            "message": "SmartPark API is running!",
            "database": "connected",
            "status": "healthy"
        }), 200

    finally:
        connection.close()


@app.route("/api/decks", methods=["GET"])
def get_decks():
    connection = get_db_connection()
    try:
        rows = connection.execute(
            "SELECT * FROM parking_decks ORDER BY id"
        ).fetchall()

        decks = []
        for row in rows:
            decks.append({
                "id": row["id"],
                "name": row["name"],
                "location": row["location"],
                "totalCapacity": row["total_capacity"],
                "occupiedSpaces": (
                    row["occupied_spaces"]
                    if row["is_data_available"]
                    else None
                ),
                "availableSpaces": row["available_spaces"],
                "occupancy": row["occupancy"],
                "status": row["status"],
                "lastUpdated": row["last_updated"],
                "isDataAvailable": bool(row["is_data_available"]),
                "dataType": row["data_type"],
                "sensorStatus": row["sensor_status"]
            })

        return jsonify(decks)
    finally:
        connection.close()


@app.route("/api/spots", methods=["GET"])
def get_spots():
    deck_id = request.args.get("deckId")
    connection = get_db_connection()
    try:
        if deck_id:
            spots = connection.execute(
                """SELECT * FROM parking_spots
                WHERE deck_id = ?
                ORDER BY level, section, spot_id""",
                (deck_id,)
            ).fetchall()
        else:
            spots = connection.execute(
                """SELECT * FROM parking_spots
                ORDER BY deck_id, level, section, spot_id"""
            ).fetchall()

        return jsonify([dict(spot) for spot in spots])
    finally:
        connection.close()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
