import { useEffect, useState } from 'react';
import { parseParkingCsv, simulateOccupancy } from '../utils/parkingLogic.js';

export function useParkingAvailability() {
  const [decks, setDecks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/parking.csv')
      .then(res => { if (!res.ok) throw new Error('CSV could not be loaded'); return res.text(); })
      .then(csv => { if (!cancelled) { setDecks(parseParkingCsv(csv)); setLastRefresh(new Date()); } })
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
