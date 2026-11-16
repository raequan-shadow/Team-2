# SmartPark AI design review

## Aligning the diagrams with the implemented backend

The UML diagrams in `docs/uml/` describe the backend that is implemented in
`v2/backend`: Flask routes, SQLAlchemy ORM models, and a SQLite database at the
configured `DATABASE_PATH`. They are implementation diagrams, not a proposal
for a future architecture.

The class diagram contains only `ParkingDeck` and `ParkingSpot`, which map to
the existing `parking_decks` and `parking_spots` tables. It records their
mapped columns, SQLite types, nullability, keys, and ORM relationship. A deck
has zero or more spots, and each spot references one deck through its required
`deck_id` foreign key.

## Database-backed availability integration

The React `useParkingAvailability` hook now requests
`http://127.0.0.1:5000/api/decks`. Flask CORS allows the Vite development
origins `http://127.0.0.1:5173` and `http://localhost:5173`.

The Flask route opens `SessionLocal`, uses SQLAlchemy to select `ParkingDeck`
rows ordered by `id`, and reads the persisted `parking_decks` table in SQLite.
It maps the rows to JSON, including `occupiedSpaces: null` when occupancy is
unavailable. The hook maps the API fields into its existing deck view model;
React then renders the deck cards and availability summary. The separate
`GET /api/spots` endpoint reads `parking_spots` for the individual-space flow.

`init_db.py` creates only missing tables through SQLAlchemy metadata and
imports the parking and spot CSV fixtures with SQLite upserts. It does not
drop or recreate the database. The CSVs are initialization fixtures: after
initialization, the availability screen reads the database-backed API rather
than fetching `parking.csv` directly.

The existing 30-second frontend timer still simulates occupancy changes
locally; it does not poll the API or persist those simulated changes. The
database-backed integration therefore verifies persisted demo data, not a
live campus sensor feed.

## Difference from the earlier Prisma/PostgreSQL design

An earlier Sprint 2 design proposed Prisma with PostgreSQL and included
`ParkingFloor`, `ParkingSpace`, `Sensor`, `OccupancyReading`, and
`CampusBuilding`, along with PostgreSQL-specific types, constraints, and
behavior. Those entities and database rules are not implemented by the current
Flask/SQLite backend, so they are intentionally excluded from the current UML.
The implemented schema instead stores deck summary fields on `ParkingDeck`
and individual spot fields on `ParkingSpot`; there are no separate floor,
sensor, reading-history, or campus-building ORM models in this backend.

The diagrams and this review were aligned to the working implementation to
avoid presenting a proposed database design as deployed behavior. This
documentation update does not rewrite or remove the earlier design from Git
history; that prior work remains available in its original commit.

## Review outcome

The diagrams and setup documentation now describe the integrated
React/Flask/SQLAlchemy/SQLite path, as implemented, while distinguishing
persisted fixture data from browser-only simulation and live sensor data.
Earlier Prisma/PostgreSQL design work remains in Git history but is not
presented as part of the current application.
