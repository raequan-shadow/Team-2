-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SpaceStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'UNKNOWN', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "SensorStatus" AS ENUM ('ONLINE', 'STALE', 'OFFLINE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "parking_decks" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location_label" TEXT NOT NULL,
    "total_capacity" INTEGER NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "parking_decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_floors" (
    "id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "floor_number" INTEGER NOT NULL,
    "label" TEXT,

    CONSTRAINT "parking_floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_spaces" (
    "id" UUID NOT NULL,
    "floor_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "section" TEXT,
    "status" "SpaceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "status_updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "parking_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "deck_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" "SensorStatus" NOT NULL DEFAULT 'UNKNOWN',
    "last_seen_at" TIMESTAMPTZ(3),

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupancy_readings" (
    "id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "sensor_id" UUID,
    "occupied_count" INTEGER,
    "observed_at" TIMESTAMPTZ(3) NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occupancy_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_buildings" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "campus_buildings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parking_decks_code_key" ON "parking_decks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "parking_floors_deck_id_floor_number_key" ON "parking_floors"("deck_id", "floor_number");

-- CreateIndex
CREATE INDEX "parking_spaces_status_idx" ON "parking_spaces"("status");

-- CreateIndex
CREATE UNIQUE INDEX "parking_spaces_floor_id_code_key" ON "parking_spaces"("floor_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_code_key" ON "sensors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_id_deck_id_key" ON "sensors"("id", "deck_id");

-- CreateIndex
CREATE INDEX "occupancy_readings_deck_id_observed_at_idx" ON "occupancy_readings"("deck_id", "observed_at" DESC);

-- CreateIndex
CREATE INDEX "occupancy_readings_sensor_id_observed_at_idx" ON "occupancy_readings"("sensor_id", "observed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "campus_buildings_code_key" ON "campus_buildings"("code");

-- AddForeignKey
ALTER TABLE "parking_floors" ADD CONSTRAINT "parking_floors_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "parking_decks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_spaces" ADD CONSTRAINT "parking_spaces_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "parking_floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "parking_decks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupancy_readings" ADD CONSTRAINT "occupancy_readings_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "parking_decks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupancy_readings" ADD CONSTRAINT "occupancy_readings_sensor_id_deck_id_fkey" FOREIGN KEY ("sensor_id", "deck_id") REFERENCES "sensors"("id", "deck_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "parking_decks"
    ADD CONSTRAINT "parking_decks_total_capacity_positive"
        CHECK ("total_capacity" > 0),
    ADD CONSTRAINT "parking_decks_coordinates_paired"
        CHECK (("latitude" IS NULL AND "longitude" IS NULL) OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)),
    ADD CONSTRAINT "parking_decks_latitude_range"
        CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
    ADD CONSTRAINT "parking_decks_longitude_range"
        CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);

-- AddCheckConstraint
ALTER TABLE "parking_floors"
    ADD CONSTRAINT "parking_floors_floor_number_positive"
        CHECK ("floor_number" > 0);

-- AddCheckConstraint
ALTER TABLE "occupancy_readings"
    ADD CONSTRAINT "occupancy_readings_count_nonnegative"
        CHECK ("occupied_count" IS NULL OR "occupied_count" >= 0);

-- AddCheckConstraint
ALTER TABLE "campus_buildings"
    ADD CONSTRAINT "campus_buildings_latitude_range"
        CHECK ("latitude" BETWEEN -90 AND 90),
    ADD CONSTRAINT "campus_buildings_longitude_range"
        CHECK ("longitude" BETWEEN -180 AND 180);

-- AddTrigger
CREATE FUNCTION "validate_occupancy_reading_capacity"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    deck_capacity INTEGER;
BEGIN
    IF NEW."occupied_count" IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT "total_capacity"
    INTO deck_capacity
    FROM "parking_decks"
    WHERE "id" = NEW."deck_id";

    IF deck_capacity IS NOT NULL AND NEW."occupied_count" > deck_capacity THEN
        RAISE EXCEPTION 'occupied_count (%) exceeds deck capacity (%)', NEW."occupied_count", deck_capacity
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "occupancy_readings_capacity_check"
BEFORE INSERT OR UPDATE OF "deck_id", "occupied_count"
ON "occupancy_readings"
FOR EACH ROW
EXECUTE FUNCTION "validate_occupancy_reading_capacity"();
