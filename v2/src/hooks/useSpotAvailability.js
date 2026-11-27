import { usePolledApi } from './usePolledApi.js';

function mapSpotsResponse(spots) {
  return spots.map(spot => ({
    deckId: spot.deck_id,
    level: String(spot.level),
    section: spot.section,
    id: spot.spot_id,
    occupied: Boolean(spot.occupied),
  }));
}

// Spot occupancy comes from the Flask/SQLite backend and refreshes with the decks.
// spots is undefined while loading and null if the spot data can't be loaded.
// If a later refresh fails, the last loaded spots are kept.
export function useSpotAvailability() {
  const { data, failed } = usePolledApi('/api/spots', mapSpotsResponse);
  return failed ? null : data;
}
