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
- Database access: Python sqlite3

## 3. Local Database Setup

### Install backend dependencies

From the root of the repository, run:

```bash
cd v2/backend
python3 -m pip install -r requirements.txt
```

### Initialize the database

```bash
python3 init_db.py
```

The expected database location is:

`v2/database/smartpark.db`

### Start the backend

```bash
python3 app.py
```

The backend runs at http://127.0.0.1:5000.

### Start the frontend

Open a separate terminal from the repository root.

```bash
cd v2
npm install
npm run dev
```

## 4. Database Connectivity Verification

The following API endpoints can be used to verify
backend and database connectivity:

| Endpoint | Purpose |
|---|---|
| /api/health | Verify backend status |
| /api/decks | Retrieve parking deck records |
| /api/spots | Retrieve individual parking spot records |

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
| KrishKPs | Local database verification | Pending confirmation |

## 6. Credential Security

- Local environment files must not be committed.
- The .env.example file must contain only placeholders.
- Local SQLite database files should not be committed.
- Database initialization scripts must remain tracked.
- Private credentials must not appear in documentation.

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

## 8. Security Verification

The following commands were executed to verify that
local environment configuration is protected:

- git status
- git check-ignore -v .env
- git ls-files .env

The .env file was confirmed to be ignored and untracked.
