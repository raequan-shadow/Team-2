# SmartPark database setup and verification

This guide covers the local development database only. The sample records are illustrative demo data; they are not live campus parking information.

## Versions

| Component | Version |
| --- | --- |
| PostgreSQL | 18.6 |
| Prisma CLI / Client | 7.10.1 |
| Node.js used for verification | 26.13.0 |

The project uses the Prisma 7 `prisma.config.ts` configuration and the server-side Prisma Client in `v2/server/prisma.ts`, backed by `@prisma/adapter-pg`.

## Local setup

1. Install PostgreSQL 18 and Node.js 20.19+ or 22.12+.
2. From the repository root, install project dependencies:

   ```sh
   cd v2
   npm install
   ```

3. Create an empty local database named `smartpark_dev` with your PostgreSQL account. For example:

   ```sh
   createdb -h localhost -U <your-postgres-user> smartpark_dev
   ```

   Alternatively, create it using your local PostgreSQL administration tool. Do not use a production connection string.

4. Create `v2/.env` (do not commit it) with your local connection URL:

   ```dotenv
   DATABASE_URL="postgresql://<your-postgres-user>:<your-password>@localhost:5432/smartpark_dev?schema=public"
   ```

   The seed and verification scripts refuse to run unless the URL targets `smartpark_dev` on `localhost`, `127.0.0.1`, or `::1`. Do not paste credentials into source files, documentation, screenshots, or shared logs.

## Migrations and seed

Run these commands from `v2`:

```sh
npm run db:validate
npm run db:generate
npx prisma migrate status
npx prisma migrate dev --name <descriptive-migration-name>
npm run db:seed
```

`migrate dev` is for local development and should only be used when creating/applying a new migration. The initial schema has already been migrated; on a fresh checkout, use the existing migrations with:

```sh
npx prisma migrate deploy
```

The seed reads the existing `public/data/parking.csv`, `public/data/spots.csv`, and campus coordinates in `src/data/campus.js`. It upserts only their stable demo identifiers and does not delete records, so rerunning it will not duplicate those demo rows or remove other developers' data. The sampled spaces in `spots.csv` are only a subset of each deck's stated capacity. Unavailable occupancy is stored as `NULL`.

## Verification

From `v2`, verify the migration state, rerun the seed if needed, and check database operations:

```sh
npx prisma migrate status
npm run db:seed
npm run db:verify
```

The verification uses the existing server-side Prisma Client to retrieve decks with floors/spaces and recent occupancy readings, disconnect and reconnect before comparing persisted readings, and perform a temporary transactional write/read check. The temporary verification row is removed within the transaction. No passwords or connection URLs are printed.

## Local database connectivity test

Results below were recorded from the local `smartpark_dev` database. Run `npm run db:verify` in your own environment before marking a team member as verified.

| Check | Result |
| --- | --- |
| Local PostgreSQL connection | PASS — PostgreSQL 18.6 |
| Deck/floor/space retrieval | PASS — 6 decks, 12 floors, 96 sampled spaces |
| Latest occupancy readings | PASS — 6 demo readings |
| Readings after disconnect/reconnect | PASS |
| Transactional write and read | PASS — temporary row removed |

## Team verification

| Team member | Local PostgreSQL version | Migration status | Seed and verification | Date |
| --- | --- | --- | --- | --- |
| _Pending teammate test_ | _Not yet reported_ | _Not yet reported_ | _Not yet reported_ | _—_ |
