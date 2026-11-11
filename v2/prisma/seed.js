import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BUILDINGS, DECK_COORDS } from "../src/data/campus.js";
import { prisma } from "../server/prisma.ts";
import { assertLocalDevelopmentDatabase } from "./database-safety.js";

function parseCsvRow(line) {
  const fields = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("Malformed CSV row: unterminated quoted field.");
  }

  fields.push(field);
  return fields;
}

async function readCsv(filename) {
  const contents = await readFile(join(process.cwd(), "public", "data", filename), "utf8");
  const lines = contents.split(/\r?\n/).filter((line) => line.length > 0);
  const headers = parseCsvRow(lines.shift() ?? "");

  if (headers.length === 0) {
    throw new Error(`CSV file is missing a header: ${filename}`);
  }

  return lines.map((line) => {
    const values = parseCsvRow(line);
    if (values.length !== headers.length) {
      throw new Error(`CSV row has the wrong number of columns: ${filename}`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function integer(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid integer in demo data: ${label}`);
  }
  return parsed;
}

function deterministicUuid(value) {
  const namespace = Buffer.from("7b8e4a1f3a5b4c6d9e0f123456789abc", "hex");
  const digest = createHash("sha1").update(namespace).update(value).digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sensorStatus(value, code) {
  const status = value.toUpperCase();
  if (!["ONLINE", "STALE", "OFFLINE", "UNKNOWN"].includes(status)) {
    throw new Error(`Unsupported sensor status in demo data for ${code}.`);
  }
  return status;
}

async function seed() {
  assertLocalDevelopmentDatabase();
  const [deckRows, spaceRows] = await Promise.all([
    readCsv("parking.csv"),
    readCsv("spots.csv"),
  ]);
  const created = {
    ParkingDeck: 0,
    ParkingFloor: 0,
    ParkingSpace: 0,
    Sensor: 0,
    OccupancyReading: 0,
    CampusBuilding: 0,
  };

  await prisma.$transaction(async (tx) => {
    const deckIds = new Map();
    const sensorIds = new Map();
    const observedAtByDeck = new Map();

    for (const row of deckRows) {
      const coordinates = DECK_COORDS[row.id];
      if (!coordinates) {
        throw new Error(`No existing campus coordinates found for demo deck ${row.id}.`);
      }
      const observedAt = new Date(row.lastUpdated);
      if (Number.isNaN(observedAt.getTime())) {
        throw new Error(`Invalid occupancy timestamp in demo data for ${row.id}.`);
      }

      const existing = await tx.parkingDeck.findUnique({ where: { code: row.id } });
      if (!existing) created.ParkingDeck += 1;
      const deck = await tx.parkingDeck.upsert({
        where: { code: row.id },
        create: {
          code: row.id,
          name: row.name,
          locationLabel: row.location,
          totalCapacity: integer(row.totalCapacity, `${row.id}.totalCapacity`),
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        },
        update: {
          name: row.name,
          locationLabel: row.location,
          totalCapacity: integer(row.totalCapacity, `${row.id}.totalCapacity`),
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          isActive: true,
        },
      });
      deckIds.set(row.id, deck.id);
      observedAtByDeck.set(row.id, observedAt);

      const sensorCode = `${row.id}-DEMO-SENSOR`;
      const existingSensor = await tx.sensor.findUnique({ where: { code: sensorCode } });
      if (!existingSensor) created.Sensor += 1;
      const sensor = await tx.sensor.upsert({
        where: { code: sensorCode },
        create: {
          code: sensorCode,
          deckId: deck.id,
          type: row.dataType || "demo",
          status: sensorStatus(row.sensorStatus, row.id),
          lastSeenAt: observedAt,
        },
        update: {
          deckId: deck.id,
          type: row.dataType || "demo",
          status: sensorStatus(row.sensorStatus, row.id),
          lastSeenAt: observedAt,
        },
      });
      sensorIds.set(row.id, sensor.id);

      const available = row.isDataAvailable.toLowerCase() === "true";
      if (!available && row.isDataAvailable.toLowerCase() !== "false") {
        throw new Error(`Invalid data-availability flag in demo data for ${row.id}.`);
      }
      const readingId = deterministicUuid(`smartpark-demo-reading:${row.id}:${observedAt.toISOString()}`);
      const occupiedCount = available
        ? integer(row.occupiedSpaces, `${row.id}.occupiedSpaces`)
        : null;
      const existingReading = await tx.occupancyReading.findUnique({ where: { id: readingId } });
      if (!existingReading) created.OccupancyReading += 1;
      await tx.occupancyReading.upsert({
        where: { id: readingId },
        create: {
          id: readingId,
          deckId: deck.id,
          sensorId: sensor.id,
          occupiedCount,
          observedAt,
        },
        update: {
          deckId: deck.id,
          sensorId: sensor.id,
          occupiedCount,
          observedAt,
        },
      });
    }

    const floorIds = new Map();
    const floors = new Set();
    for (const row of spaceRows) {
      const deckId = deckIds.get(row.deckId);
      if (!deckId) {
        throw new Error(`Spot data refers to unknown demo deck ${row.deckId}.`);
      }
      const floorNumber = integer(row.level, `${row.deckId}.level`);
      const floorKey = `${row.deckId}:${floorNumber}`;
      if (!floors.has(floorKey)) {
        floors.add(floorKey);
        const existingFloor = await tx.parkingFloor.findUnique({
          where: { deckId_floorNumber: { deckId, floorNumber } },
        });
        if (!existingFloor) created.ParkingFloor += 1;
        const floor = await tx.parkingFloor.upsert({
          where: { deckId_floorNumber: { deckId, floorNumber } },
          create: {
            deckId,
            floorNumber,
            label: `Level ${floorNumber}`,
          },
          update: { label: `Level ${floorNumber}` },
        });
        floorIds.set(floorKey, floor.id);
      }

      const floorId = floorIds.get(floorKey);
      const existingSpace = await tx.parkingSpace.findUnique({
        where: { floorId_code: { floorId, code: row.spotId } },
      });
      if (!existingSpace) created.ParkingSpace += 1;
      const occupied = row.occupied.toLowerCase();
      if (occupied !== "true" && occupied !== "false") {
        throw new Error(`Invalid spot occupancy flag in demo data for ${row.spotId}.`);
      }
      await tx.parkingSpace.upsert({
        where: { floorId_code: { floorId, code: row.spotId } },
        create: {
          floorId,
          code: row.spotId,
          section: row.section,
          status: occupied === "true" ? "OCCUPIED" : "AVAILABLE",
          statusUpdatedAt: observedAtByDeck.get(row.deckId),
        },
        update: {
          section: row.section,
          status: occupied === "true" ? "OCCUPIED" : "AVAILABLE",
          statusUpdatedAt: observedAtByDeck.get(row.deckId),
        },
      });
    }

    for (const building of BUILDINGS) {
      const existing = await tx.campusBuilding.findUnique({ where: { code: building.id } });
      if (!existing) created.CampusBuilding += 1;
      await tx.campusBuilding.upsert({
        where: { code: building.id },
        create: {
          code: building.id,
          name: building.name,
          latitude: building.lat,
          longitude: building.lng,
        },
        update: {
          name: building.name,
          latitude: building.lat,
          longitude: building.lng,
          isActive: true,
        },
      });
    }
  });

  console.log("Development/demo seed completed.");
  for (const [model, count] of Object.entries(created)) {
    console.log(`${model}: ${count} created`);
  }
}

try {
  await seed();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Development seed failed: ${message.replace(/(?:postgres(?:ql)?):\/\/[^\s]+/gi, "[redacted database URL]")}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
