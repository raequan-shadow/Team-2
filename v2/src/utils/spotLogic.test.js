import { describe, expect, test } from 'vitest';
import { parseSpotsCsv, simulateSpots, spotsByLevel } from './spotLogic.js';
import csv from '../../public/data/spots.csv?raw';

const spots = parseSpotsCsv(csv);

describe('parseSpotsCsv', () => {
  test('reads every spot with a boolean occupied flag', () => {
    expect(spots).toHaveLength(48);
    expect(spots[0]).toEqual({ deckId: 'D01', level: '1', section: 'A', id: '1A-01', occupied: true });
    expect(spots[1].occupied).toBe(false);
  });

  test('spot ids are unique within a deck', () => {
    for (const deckId of ['D01', 'D03', 'D05']) {
      const ids = spots.filter(s => s.deckId === deckId).map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('spotsByLevel', () => {
  test('groups one deck’s spots by level then section', () => {
    const levels = spotsByLevel(spots, 'D01');
    expect(Object.keys(levels)).toEqual(['1', '2']);
    expect(Object.keys(levels['1'])).toEqual(['A', 'B']);
    expect(levels['1'].A.map(s => s.id)).toEqual(['1A-01', '1A-02', '1A-03', '1A-04']);
  });

  test('deck without spot data returns no levels', () => {
    expect(spotsByLevel(spots, 'D02')).toEqual({});
  });
});

describe('simulateSpots', () => {
  test('flips spots when the roll is under 0.1', () => {
    expect(simulateSpots(spots, () => 0).every((s, i) => s.occupied !== spots[i].occupied)).toBe(true);
  });

  test('leaves spots alone otherwise, without copying them', () => {
    expect(simulateSpots(spots, () => 0.5).every((s, i) => s === spots[i])).toBe(true);
  });
});
