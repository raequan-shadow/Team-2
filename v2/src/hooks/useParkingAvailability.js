import { useEffect, useState } from 'react';
import { simulateOccupancy } from '../utils/parkingLogic.js';

const DECKS_API_URL = 'http://127.0.0.1:5000/api/decks';

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

export function useParkingAvailability() {
  const [decks, setDecks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(DECKS_API_URL)
      .then(res => { if (!res.ok) throw new Error('Parking API could not be loaded'); return res.json(); })
      .then(data => { if (!cancelled) { setDecks(mapDecksResponse(data)); setLastRefresh(new Date()); } })
      .catch(() => { if (!cancelled) setError('Parking data is temporarily unavailable. Please try again later.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (loading || error) return;
    const timer = setInterval(() => {
      setDecks(current => simulateOccupancy(current));
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, [loading, error]);

  return { decks, error, loading, lastRefresh };
}
