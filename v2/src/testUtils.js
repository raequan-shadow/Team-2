import { parseSpotsCsv } from './utils/spotLogic.js';

// Turns spots.csv text into the JSON shape returned by GET /api/spots.
export function spotsApiFromCsv(csv) {
  return parseSpotsCsv(csv).map(spot => ({
    spot_id: spot.id,
    deck_id: spot.deckId,
    level: Number(spot.level),
    section: spot.section,
    occupied: spot.occupied ? 1 : 0,
  }));
}

export const jsonResponse = (body, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });
