import { useEffect, useState } from 'react';
import { parseSpotsCsv, simulateSpots } from '../utils/spotLogic.js';

// spots is undefined while loading and null if the spot data can't be loaded.
export function useSpotAvailability() {
  const [spots, setSpots] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/spots.csv')
      .then(res => { if (!res.ok) throw new Error('Spot CSV could not be loaded'); return res.text(); })
      .then(csv => { if (!cancelled) setSpots(parseSpotsCsv(csv)); })
      .catch(() => { if (!cancelled) setSpots(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!spots) return;
    const timer = setInterval(() => setSpots(current => simulateSpots(current)), 30000);
    return () => clearInterval(timer);
  }, [!spots]);

  return spots;
}
