# SmartPark AI design review

## Step 1.2 data-model decisions

The initial Sprint 2 schema models decks, floors, spaces, deck-level occupancy
readings, sensors, and campus buildings. It is intentionally limited to the
selected scope in GitHub Issues #1–#4.

### AI-generated decisions corrected or constrained

- **Parking sessions were excluded.** An earlier AI proposal included a
  `ParkingSession` table because the Figma driver flow depicts sign-in,
  tap-in/tap-out, a vehicle, and an automatic six-hour release. Those screens
  label NinerNET and Parking Services as mocked, while Issues #1–#4 require
  aggregate availability, space status, staff occupancy/sensor monitoring,
  and nearby-deck discovery—not persistent driver identity, vehicle tracking,
  reservations, or session history. Persisting sessions would therefore add
  personal data and business rules without an approved acceptance criterion.
  Revisit this decision only if the team expands the Sprint 2 scope.
- **Unavailable aggregate occupancy is represented by `NULL`, not zero.**
  `OccupancyReading.occupiedCount` is nullable so a failed, missing, or
  unavailable sensor reading cannot be mistaken for an empty deck. A reading
  row with a null count records that a reading was received but its value was
  unavailable.
- **Sensor is a separate model; space-status history is deferred.** Issue #3
  explicitly requires staff to see sensor operational status, so the schema
  tracks sensors and their deck-level aggregate readings. Issues #1–#4 do not
  require an audit timeline for every individual-space transition; the schema
  stores current `ParkingSpace.status` and leaves per-space history for a
  later approved requirement.
- **Deck capacity and coordinate validation spans more than Prisma's schema
  language can express.** The initial PostgreSQL migration adds explicit
  `CHECK` constraints for positive capacity/floor numbers, valid coordinate
  ranges and coordinate pairs, and nonnegative occupancy values. The
  cross-table rule that an occupied count cannot exceed a deck's capacity
  cannot be expressed as a PostgreSQL `CHECK`, because checks cannot
  reference another table. The migration enforces this rule with a trigger on
  new or updated readings. The reading's composite sensor foreign key also
  ensures that a sensor belongs to the same deck as its reading.

### Model purposes

- `ParkingDeck`: stable deck identity, location label, capacity, optional
  coordinates, and active state.
- `ParkingFloor`: a numbered floor belonging to a deck.
- `ParkingSpace`: a uniquely labeled space on a floor and its current
  availability/service status.
- `OccupancyReading`: timestamped aggregate count, with an optional sensor
  source and nullable count for unavailable data.
- `Sensor`: sensor identity, deck association, operational status, and
  last-seen timestamp for the staff dashboard.
- `CampusBuilding`: named, geocoded destination used to calculate nearby
  parking. Nearby distances and ordering are derived from coordinates, not
  stored as stale facts.

### Relationships and behavior

One deck has many floors, sensors, and occupancy readings. A floor has many
spaces. Each occupancy reading belongs to a deck and may optionally identify
its sensor. Foreign keys restrict deletion of records that have dependent
operational data; sensor deletion sets an old reading's optional sensor
reference to null. Unique constraints protect deck codes, sensor codes,
floor numbers within a deck, and space codes within a floor.

Available aggregate spaces, occupancy percentages, color bands, stale state,
and nearby distances are calculated from capacity, readings, timestamps, and
coordinates. These derived values are not stored as duplicate columns.

### Reusable development data

- `public/data/parking.csv` can seed `ParkingDeck` rows and initial
  `OccupancyReading` examples. Recalculate available counts and status from
  capacity and occupancy rather than copying the CSV's derived values.
- `public/data/spots.csv` can seed `ParkingFloor` and `ParkingSpace` rows.
  Its rows are illustrative and should not be treated as verified sensor
  inventory.
- `src/data/campus.js` can seed `CampusBuilding` and deck coordinates after
  verification. Its comments identify the coordinates as approximate.

These are prototype fixtures, not a production feed. No seed script is part
of this step.

### Migration and client boundaries

The initial migration was generated from the Prisma schema and then augmented
with PostgreSQL constraints and a trigger Prisma Schema Language cannot
declare. It has not been applied to any database. `server/prisma.ts` creates
the PostgreSQL driver-adapter client for server-side use only. It is
TypeScript because Prisma 7's generated client is TypeScript; run a future
Node.js API with a TypeScript runner such as `tsx`. React components must call
a server API; they must never import this module or receive database
credentials.

## Validation

From `v2`, after installing the declared dependencies and generating the
client:

1. `npm run db:validate` validates the Prisma schema. Set a local placeholder
   `DATABASE_URL` in the process environment for this schema-only command if
   no local development database is configured; it does not connect.
2. `npm run db:generate` generates the client from the schema; it does not
   apply migrations.
3. Review `prisma/migrations/20261110120000_initial_smartpark/migration.sql`.
   Do not run `prisma migrate dev`, `prisma db push`, or another apply command
   until local PostgreSQL is configured and the migration is approved.

   ## Team Review and Approval

The SmartPark team reviewed the AI-generated data model against our existing GitHub Issues (#1–#4), Figma prototype, and Sprint 2 requirements.

The team agreed to use PostgreSQL with Prisma ORM for database persistence.

The proposed schema was refined to prioritize the database entities necessary for parking availability, individual parking spaces, occupancy monitoring, sensor health, and campus-building information.

Additional features such as persistent parking sessions, NFC tag assignments, and vehicle records were excluded from the initial implementation scope pending further requirements and team approval.

**Review outcome:** Database technology approved by the team. Final schema and feature-scope decisions should be confirmed with all team members before integration.
