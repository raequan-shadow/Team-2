// Parses parking.csv (the seed data the backend imports). Live occupancy comes from the API.
export function parseParkingCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const keys = header.split(',');
  return rows.filter(Boolean).map(row => {
    const values = row.split(','); // Dataset uses simple CSV values without embedded commas.
    const entry = Object.fromEntries(keys.map((key, i) => [key, values[i] ?? '']));
    const available = entry.isDataAvailable === 'true' && entry.occupiedSpaces !== '';
    return {
      id: entry.id,
      name: entry.name,
      location: entry.location,
      totalCapacity: Number(entry.totalCapacity),
      occupiedSpaces: available ? Number(entry.occupiedSpaces) : null,
      isDataAvailable: available,
      lastUpdated: entry.lastUpdated,
      sensorStatus: entry.sensorStatus || 'online',
    };
  });
}

export function availableSpaces(deck) {
  if (!deck.isDataAvailable || deck.occupiedSpaces === null || !Number.isFinite(deck.occupiedSpaces)) return null;
  return Math.max(0, deck.totalCapacity - deck.occupiedSpaces);
}

export function availabilityStatus(deck) {
  const available = availableSpaces(deck);
  if (available === null || deck.totalCapacity <= 0) return 'Unavailable';
  const ratio = available / deck.totalCapacity;
  if (ratio >= 0.2) return 'Green';
  if (ratio >= 0.05) return 'Yellow';
  return 'Red';
}

// PATS dashboard labels. Thresholds match the driver colors: Yellow = approaching, Red = full.
export function occupancyLevel(deck) {
  return { Green: 'Normal', Yellow: 'Approaching capacity', Red: 'At capacity', Unavailable: 'No data' }[availabilityStatus(deck)];
}

export function sensorHealth(deck) {
  if (!deck.isDataAvailable || deck.sensorStatus === 'offline') return 'Offline';
  if (deck.sensorStatus === 'stale') return 'Stale';
  return 'Online';
}
