import { useEffect, useState } from 'react';

const DECKS_API_URL = 'http://127.0.0.1:5000/api/decks';

function mapDecksResponse(decks) {
  return decks.map(deck => {
    const hasOccupancy =
      deck.isDataAvailable && deck.occupiedSpaces !== null;

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

    const loadParkingData = () => {
      fetch(DECKS_API_URL)
        .then(res => {
          if (!res.ok) {
            throw new Error('Parking data could not be loaded');
          }
          return res.json();
        })
        .then(data => {
          if (!cancelled) {
            setDecks(mapDecksResponse(data));
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
 