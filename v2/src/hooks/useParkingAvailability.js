import { useEffect, useState } from 'react';

export function useParkingAvailability() {
  const [decks, setDecks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadParkingData = () => {
      fetch('http://127.0.0.1:5000/api/decks')
        .then(res => {
          if (!res.ok) throw new Error('Parking data could not be loaded');
          return res.json();
        })
        .then(data => {
          if (!cancelled) {
            setDecks(data);
            setError('');
            setLastRefresh(new Date());
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError('Parking data is temporarily unavailable. Please try again later.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    loadParkingData();

    const timer = setInterval(loadParkingData, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { decks, error, loading, lastRefresh };
}