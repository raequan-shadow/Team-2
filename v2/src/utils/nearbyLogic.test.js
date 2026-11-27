import { describe, expect, test } from 'vitest';
import { BUILDINGS, DECK_COORDS } from '../data/campus.js';
import { directionsUrl, distanceMeters, nearbyDecks, walkMinutes } from './nearbyLogic.js';
import { parseParkingCsv } from './parkingLogic.js';
import csv from '../../public/data/parking.csv?raw';

const decks = parseParkingCsv(csv);
const building = name => BUILDINGS.find(b => b.name === name);

describe('distanceMeters', () => {
  test('is zero for the same point and symmetric', () => {
    const a = DECK_COORDS.D01, b = DECK_COORDS.D02;
    expect(distanceMeters(a, a)).toBe(0);
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });

  test('matches a known distance (0.001° latitude ≈ 111 m)', () => {
    expect(distanceMeters({ lat: 35, lng: -80 }, { lat: 35.001, lng: -80 })).toBeCloseTo(111.2, 0);
  });
});

test('walkMinutes rounds at 80 m per minute, with a 1 minute minimum', () => {
  expect(walkMinutes(0)).toBe(1);
  expect(walkMinutes(160)).toBe(2);
  expect(walkMinutes(640)).toBe(8);
});

describe('nearbyDecks', () => {
  test('returns decks within 800 m, closest first', () => {
    expect(nearbyDecks(decks, building('Atkins Library')).map(r => [r.deck.name, r.meters]))
      .toEqual([['Main Deck', 189], ['East Deck 2', 295], ['Union Deck', 466], ['South Village Deck', 640]]);
  });

  test('a far-away building has no nearby decks', () => {
    expect(nearbyDecks(decks, building('Harris Alumni Center'))).toEqual([]);
  });

  test('custom radius and decks without coordinates', () => {
    expect(nearbyDecks(decks, building('Atkins Library'), 200).map(r => r.deck.id)).toEqual(['D01']);
    expect(nearbyDecks([{ id: 'D99' }], building('Atkins Library'))).toEqual([]);
  });

  test('every building and deck has valid coordinates', () => {
    for (const p of [...BUILDINGS, ...Object.values(DECK_COORDS)]) {
      expect(p.lat).toBeGreaterThan(35.29);
      expect(p.lat).toBeLessThan(35.32);
      expect(p.lng).toBeGreaterThan(-80.75);
      expect(p.lng).toBeLessThan(-80.72);
    }
    expect(Object.keys(DECK_COORDS)).toEqual(decks.map(d => d.id));
  });
});

test('directionsUrl points Google Maps at the deck', () => {
  expect(directionsUrl('D01')).toBe('https://www.google.com/maps/dir/?api=1&destination=35.3065,-80.734&travelmode=driving');
});
