# SmartPark - Database Setup

## 1. Database Selection

Our team selected SQLite as the development database for
SmartPark because it is lightweight, easy to configure,
and does not require a separate database server.

Each team member maintains a local SQLite database using
the same database initialization script.

## 2. Technology Stack

- Frontend: React
- Backend: Python Flask
- Database: SQLite
- ORM and database access: SQLAlchemy 2.1

## 3. Local Database Setup

### Install backend dependencies

From the repository root, install the backend dependencies:

```bash
cd v2/backend
python -m pip install -r requirements.txt
```

### Initialize the database

```bash
python init_db.py
```

The initializer uses SQLAlchemy models and the configured
`DATABASE_PATH`.

By default, `DB_PATH=./database/smartpark.db` resolves to:

`v2/database/smartpark.db`

It creates missing `parking_decks`, `parking_spots`, and
`parking_sessions` tables and imports the CSV fixtures
with SQLite upserts.

Re-running it updates matching parking deck and spot rows.
It does not drop or recreate the database, but it may reset
existing occupancy values to the original CSV values.

For existing databases that already use the corrected
composite parking-spot primary key, follow the migration
instructions in Section 9 to add parking-session storage
without resetting existing parking data.

### Start the backend

```bash
python app.py
```

The backend runs at http://127.0.0.1:5000.

### Start the frontend

Open a separate terminal from the repository root.

```bash
cd v2
npm install
npm run dev
```

The React availability hooks request parking data through
the Flask API.

Flask CORS allows the Vite origins
`http://127.0.0.1:5173` and `http://localhost:5173`.

## 4. Database Connectivity Verification

The following API endpoints can be used to verify
backend and database connectivity:

| Endpoint | Purpose |
|---|---|
| /api/health | Verify backend status |
| /api/decks | Retrieve parking deck records |
| /api/spots | Retrieve individual parking spot records |

`GET /api/decks` queries `ParkingDeck` rows through
SQLAlchemy, ordered by `id`, and returns JSON used by
the React availability hook.

The hook maps the response fields into the existing
deck view model.

`GET /api/spots` separately queries individual spaces.

The database is initially seeded from demo CSV data.

During Sprint 3, occupancy simulation was centralized
in the backend. The frontend retrieves parking deck
and individual parking spot availability through Flask
API requests and periodically refreshes the displayed data.

The occupancy data remains simulated and does not
represent a live physical parking sensor feed.

## 5. Team Database Verification

| Team Member | Connection Test | Result |
|---|---|---|
| jayasmitadatta | Flask backend startup and API health check | Pass |
| jayasmitadatta | Retrieve parking deck records | Pass |
| jayasmitadatta | Retrieve parking spot records | Pass |
| jayasmitadatta | Verify .env is ignored and untracked | Pass |
| raequan-shadow | Local database verification | Pass |
| ChinnyIgwuilo | Local database verification | Pending confirmation |
| sanskritithapak5-code | Local database verification | Pending confirmation |
| KrishKPs | Local database verification | Pass |

## 6. Database Security Verification

### Security Measures Implemented

- Updated the root `.gitignore` to protect environment
  files, private keys, and local SQLite database files.
- Added ignore rules for Python virtual environments,
  generated files, and frontend dependencies.
- Maintained a local `.env` file for database configuration.
- Updated `.env.example` with a safe SQLite database
  configuration template.
- Kept database initialization scripts available so each
  team member can reproduce the database locally.

### Security Verification Results

| Verification Command | Result |
|---|---|
| `git status` | Repository status inspected |
| `git check-ignore -v .env` | Successfully ignored |
| `git ls-files .env` | No output — file is not tracked |
| `git check-ignore -v .env.local .env.development test.pem test.key` | Security rules successfully verified |
| `git diff --cached --name-only` | Only intended files staged |
| `git show 1459d42` | Security commit inspected |

### Database Credential Protection

SmartPark uses Flask and SQLite. SQLite does not require
a database username or password for our local
implementation.

The database path is configured through the `DB_PATH`
environment variable.

The `.env.example` file is shared with the team, while
the actual `.env` file remains local.

### GitHub Commit

- Commit ID: `1459d42`
- Commit message: Strengthen database security and protect sensitive configuration files
- Status: Successfully pushed to GitHub

## 7. Environment Configuration

The application uses python-dotenv to load database
configuration from the `.env` file in the repository root.

The shared `backend/config.py` module provides a consistent
database path for `app.py`, `init_db.py`, and the
parking-session migration script.

Each team member should copy `.env.example` to `.env`.

The default configuration is:

```dotenv
DB_PATH=./database/smartpark.db
```

Relative database paths are resolved from the `v2` folder.

The `.env` file is ignored by Git and must not be committed.

## 8. Related Configuration Files

- [.gitignore](../.gitignore)
- [.env.example](../.env.example)

## 9. Parking Session Database Migration (Sprint 3)

Related GitHub Issue: #41 — Implement persistent SQLite
storage for parking sessions.

### Purpose

The `parking_sessions` table provides persistent storage
for parking-session information, supporting the development
of backend parking-session verification.

Previously, tap-in and tap-out information was maintained
in local React state rather than persistent database storage.

### Database Schema

The new `ParkingSession` model is defined in
`v2/backend/models.py`.

| Column | Data Type | Purpose |
|---|---|---|
| session_id | INTEGER | Primary key identifying each session |
| spot_id | TEXT | Selected parking spot identifier |
| deck_id | TEXT | Selected parking deck identifier |
| started_at | TEXT | Parking session start time |
| ended_at | TEXT | Parking session end time; nullable |

The combination of `spot_id` and `deck_id` forms a
composite foreign key referencing the `parking_spots` table.

This ensures that each parking session references a valid
parking spot within the correct deck when foreign key
enforcement is enabled.

An active session is represented by a NULL `ended_at` value.
A completed session contains an end timestamp.

### Update an Existing Database

Before running the migration, ensure that the existing
database uses the corrected composite primary key
(`spot_id`, `deck_id`) in the `parking_spots` table.

The migration does not repair older parking-spot schemas.

Stop the backend and any running occupancy simulator
before performing the database backup and migration.

From the repository root:

```bash
cd v2
```

For the default database location, create a backup:

```bash
sqlite3 database/smartpark.db ".backup 'database/smartpark.before-sessions.db'"
```

If using a custom `DB_PATH`, back up the configured
database instead.

Run the migration:

```bash
python backend/migrate_sessions.py
```

Expected output:

```text
Parking sessions table is ready.
```

The migration uses the existing SQLAlchemy database
connection and creates only the `parking_sessions` table.

It does not reimport the CSV fixtures or overwrite existing
parking deck and spot records.

The script checks whether the table already exists before
attempting to create it.

### Verify the Migration

For the default database location, run:

```bash
sqlite3 database/smartpark.db ".tables"
```

Expected tables:

```text
parking_decks  parking_sessions  parking_spots
```

To inspect the session table structure:

```bash
sqlite3 database/smartpark.db ".schema parking_sessions"
```

### Fresh Database Installations

For fresh installations, the existing `init_db.py` script
creates all three tables through SQLAlchemy metadata.

A separate session migration is not required when
initializing a new database using the updated models.

### Manual Testing Results

| Test | Expected Result | Result |
|---|---|---|
| Session table creation | New table exists in SQLite | Pass |
| Existing deck preservation | All 6 deck records retained | Pass |
| Existing spot preservation | All 96 spot records retained | Pass |
| Before-and-after data comparison | Existing parking tables remain identical | Pass |
| Session storage | Valid session successfully inserted | Pass |
| Session retrieval | Stored session successfully retrieved | Pass |
| Foreign key validation | Invalid parking spot rejected | Pass |

Session insertion, retrieval, and foreign key validation
were performed using a separate temporary test database
to avoid introducing test records into the working database.

### Engineering Decision

A separate migration script was introduced because the
existing initialization script performs CSV upserts that
may reset current occupancy values.

Creating only the new session table preserves existing
parking data while extending the database schema.

### Implementation Scope

Issue #41 establishes persistent parking-session storage.

Backend API endpoints, availability verification, and
parking-session management are addressed in Issue #42.

Prevention of conflicting active parking-space assignments
is addressed in Issue #43.

Frontend tap-in and tap-out integration and automated
integration testing remain separate implementation tasks.

### AI Assistance

ChatGPT was used to assist with database schema design,
composite foreign key implementation, migration planning,
manual testing procedures, and documentation.

The implementation was reviewed and manually validated
against the existing SmartPark database.