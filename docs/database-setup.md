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

The initializer uses SQLAlchemy models and the configured `DATABASE_PATH`.
By default, `DB_PATH=./database/smartpark.db` resolves to:

`v2/database/smartpark.db`

It creates missing `parking_decks` and `parking_spots` tables and imports the
CSV fixtures with SQLite upserts. Re-running it updates matching rows; it does
not drop or recreate the database.

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

The React availability hook requests
`http://127.0.0.1:5000/api/decks`. Flask CORS allows the Vite origins
`http://127.0.0.1:5173` and `http://localhost:5173`.

## 4. Database Connectivity Verification

The following API endpoints can be used to verify
backend and database connectivity:

| Endpoint | Purpose |
|---|---|
| /api/health | Verify backend status |
| /api/decks | Retrieve parking deck records |
| /api/spots | Retrieve individual parking spot records |

`GET /api/decks` queries `ParkingDeck` rows through SQLAlchemy, ordered by
`id`, and returns JSON used by the React availability hook. The hook maps the
response fields into the existing deck view model. `GET /api/spots` separately
queries individual spaces.

The database is seeded from demo CSV data. The frontend retains its existing
local 30-second occupancy simulation; the timer does not poll the API or turn
the fixture data into a live sensor feed.

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

- Updated the root `.gitignore` to protect environment files, private keys, and local SQLite database files.
- Excluded Python virtual environments, generated files, and frontend dependencies.
- Maintained a local `.env` file for database configuration.
- Updated `.env.example` with a safe SQLite database configuration template.
- Kept database initialization scripts available so each team member can reproduce the database locally.

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

SmartPark uses Flask and SQLite. SQLite does not require a database username or password for our local implementation. The database path is configured through the `DB_PATH` environment variable.

The `.env.example` file is shared with the team, while the actual `.env` file remains local.

### GitHub Commit

- Commit ID: `1459d42`
- Commit message: Strengthen database security and protect sensitive configuration files
- Status: Successfully pushed to GitHub

## 7. Environment Configuration

The application uses python-dotenv to load database
configuration from the .env file in the repository root.

The shared backend/config.py module provides a consistent
database path for both app.py and init_db.py.

Each team member should copy .env.example to .env.

The default configuration is:

```dotenv
DB_PATH=./database/smartpark.db
```

Relative database paths are resolved from the v2 folder.

The .env file is ignored by Git and must not be committed.


## 8. Related Configuration Files
- [.gitignore](../.gitignore)
- [.env.example](../.env.example)
    
