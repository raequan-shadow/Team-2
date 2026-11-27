// Simulated per-spot occupancy. Only decks listed in spots.csv have individual-space data.
export function parseSpotsCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const keys = header.split(',');
  return rows.filter(Boolean).map(row => {
    const entry = Object.fromEntries(keys.map((key, i) => [key, row.split(',')[i] ?? '']));
    return { deckId: entry.deckId, level: entry.level, section: entry.section, id: entry.spotId, occupied: entry.occupied === 'true' };
  });
}

// { '1': { A: [spot, ...], B: [...] }, '2': {...} } for one deck, in CSV order.
export function spotsByLevel(spots, deckId) {
  const levels = {};
  for (const spot of spots.filter(s => s.deckId === deckId)) {
    ((levels[spot.level] ??= {})[spot.section] ??= []).push(spot);
  }
  return levels;
}

// Each tick a few spots flip, like cars arriving or leaving.
export function simulateSpots(spots, random = Math.random) {
  return spots.map(spot => (random() < 0.1 ? { ...spot, occupied: !spot.occupied } : spot));
}
