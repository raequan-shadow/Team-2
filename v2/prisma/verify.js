import { randomUUID } from "node:crypto";
import { prisma } from "../server/prisma.ts";
import { assertLocalDevelopmentDatabase } from "./database-safety.js";

async function verify() {
  assertLocalDevelopmentDatabase();

  const serverVersion = await prisma.$queryRaw`SELECT version() AS version`;
  const databaseCounts = await Promise.all([
    prisma.parkingDeck.count(),
    prisma.parkingFloor.count(),
    prisma.parkingSpace.count(),
    prisma.sensor.count(),
    prisma.occupancyReading.count(),
    prisma.campusBuilding.count(),
  ]);
  const decks = await prisma.parkingDeck.findMany({
    orderBy: { code: "asc" },
    include: {
      floors: {
        orderBy: { floorNumber: "asc" },
        include: { spaces: { orderBy: { code: "asc" } } },
      },
    },
  });
  const latestReadings = await prisma.occupancyReading.findMany({
    orderBy: [{ observedAt: "desc" }, { deckId: "asc" }],
    take: 10,
    include: {
      deck: { select: { code: true, name: true } },
      sensor: { select: { code: true, status: true } },
    },
  });
  const firstReadings = await prisma.occupancyReading.findMany({
    orderBy: { id: "asc" },
    select: { id: true, observedAt: true, occupiedCount: true },
  });

  await prisma.$disconnect();
  await prisma.$connect();

  const reconnectedReadings = await prisma.occupancyReading.findMany({
    orderBy: { id: "asc" },
    select: { id: true, observedAt: true, occupiedCount: true },
  });
  const persisted =
    firstReadings.length === reconnectedReadings.length &&
    firstReadings.every((reading, index) =>
      reading.id === reconnectedReadings[index]?.id &&
      reading.observedAt.getTime() === reconnectedReadings[index]?.observedAt.getTime() &&
      reading.occupiedCount === reconnectedReadings[index]?.occupiedCount
    );
  if (!persisted) {
    throw new Error("Occupancy readings did not match after reconnecting to PostgreSQL.");
  }

  const testCode = `VERIFY-${randomUUID()}`;
  const writeReadPassed = await prisma.$transaction(async (tx) => {
    const building = await tx.campusBuilding.create({
      data: {
        code: testCode,
        name: "Temporary development connectivity check",
        latitude: 0,
        longitude: 0,
        isActive: false,
      },
    });
    const readBack = await tx.campusBuilding.findUnique({ where: { code: testCode } });
    await tx.campusBuilding.delete({ where: { code: testCode } });
    return readBack?.id === building.id && readBack.name === building.name;
  });
  if (!writeReadPassed) {
    throw new Error("Transactional database write/read check failed.");
  }

  const version = serverVersion[0]?.version ?? "Unknown PostgreSQL version";
  const deckDetails = decks.map((deck) => ({
    code: deck.code,
    floors: deck.floors.map((floor) => ({
      number: floor.floorNumber,
      spaceCount: floor.spaces.length,
      spaces: floor.spaces.map((space) => `${space.code}:${space.status}`),
    })),
  }));
  const readings = latestReadings.map((reading) => ({
    deck: reading.deck.code,
    occupiedCount: reading.occupiedCount,
    observedAt: reading.observedAt.toISOString(),
    sensor: reading.sensor?.code ?? null,
    sensorStatus: reading.sensor?.status ?? null,
  }));
  console.log(JSON.stringify({
    postgresVersion: version,
    modelRecordCounts: {
      ParkingDeck: databaseCounts[0],
      ParkingFloor: databaseCounts[1],
      ParkingSpace: databaseCounts[2],
      Sensor: databaseCounts[3],
      OccupancyReading: databaseCounts[4],
      CampusBuilding: databaseCounts[5],
    },
    decksWithFloorsAndSpaces: deckDetails,
    latestOccupancyReadings: readings,
    persistenceAfterDisconnectReconnect: persisted ? "PASS" : "FAIL",
    transactionalWriteRead: writeReadPassed ? "PASS (temporary row removed)" : "FAIL",
  }, null, 2));
}

try {
  await verify();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Database verification failed: ${message.replace(/(?:postgres(?:ql)?):\/\/[^\s]+/gi, "[redacted database URL]")}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
