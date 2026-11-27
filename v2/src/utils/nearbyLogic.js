import { DECK_COORDS } from '../data/campus.js';

export const NEARBY_METERS = 800;
const WALK_METERS_PER_MINUTE = 80;

// ponytail: straight-line (haversine) distance, not the walking path; swap in a routing API if paths matter.
export function distanceMeters(a, b) {
  const rad = deg => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export const walkMinutes = meters => Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE));

// Decks within NEARBY_METERS of the building, closest first. Decks without coordinates are skipped.
export function nearbyDecks(decks, building, maxMeters = NEARBY_METERS) {
  return decks
    .filter(deck => DECK_COORDS[deck.id])
    .map(deck => ({ deck, meters: Math.round(distanceMeters(building, DECK_COORDS[deck.id])) }))
    .filter(({ meters }) => meters <= maxMeters)
    .sort((a, b) => a.meters - b.meters);
}

export function directionsUrl(deckId) {
  const { lat, lng } = DECK_COORDS[deckId];
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}
