// Source CSV provides starting occupancy. All values shown are simulated.
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

// Each tick changes a few decks, like vehicles entering or leaving.
export function simulateOccupancy(decks, random = Math.random) {
  return decks.map(deck => {
    if (!deck.isDataAvailable || deck.occupiedSpaces === null || random() > 0.75) return deck;
    const delta = Math.floor(random() * 21) - 10;
    const occupiedSpaces = Math.max(0, Math.min(deck.totalCapacity, deck.occupiedSpaces + delta));
    return { ...deck, occupiedSpaces, lastUpdated: new Date().toISOString() };
  });
}
