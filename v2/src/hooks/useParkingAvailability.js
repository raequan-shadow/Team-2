import { usePolledApi } from './usePolledApi.js';

export const PARKING_ERROR = 'Parking data is temporarily unavailable. Please try again later.';

function mapDecksResponse(decks) {
  return decks.map(deck => {
    const hasOccupancy = deck.isDataAvailable && deck.occupiedSpaces !== null;
    return {
      id: deck.id,
      name: deck.name,
      location: deck.location,
      totalCapacity: Number(deck.totalCapacity),
      occupiedSpaces: hasOccupancy ? Number(deck.occupiedSpaces) : null,
      isDataAvailable: hasOccupancy,
      lastUpdated: deck.lastUpdated,
      sensorStatus: deck.sensorStatus || 'online',
    };
  });
}

// Deck occupancy comes only from the Flask/SQLite backend. The browser never
// changes the numbers itself, so every open session shows the same values.
export function useParkingAvailability() {
  const { data, loading, failed, stale, lastRefresh } = usePolledApi('/api/decks', mapDecksResponse);
  return { decks: data ?? [], loading, error: failed ? PARKING_ERROR : '', stale, lastRefresh };
}
