import { describe, expect, test } from 'vitest';
import { availableSpaces, availabilityStatus, occupancyLevel, parseParkingCsv, sensorHealth, simulateOccupancy } from './parkingLogic.js';
import csv from '../../public/data/parking.csv?raw';
const base = { id: '1', name: 'Deck', totalCapacity: 200, occupiedSpaces: 100, isDataAvailable: true };

describe('shipped parking.csv', () => {
  const decks = parseParkingCsv(csv);
  const rows = csv.trim().split('\n').slice(1).map(r => r.split(','));

  test('loads all six decks', () => {
    expect(decks.map(d => d.name)).toEqual(['Main Deck', 'Union Deck', 'East Deck 2', 'North Deck', 'South Village Deck', 'West Deck']);
  });

  test('available = capacity - occupied matches the CSV for every row', () => {
    decks.forEach((deck, i) => expect(availableSpaces(deck)).toBe(Number(rows[i][5])));
  });

  test('computed status matches the CSV status column', () => {
    decks.forEach((deck, i) => expect(availabilityStatus(deck)).toBe(rows[i][7]));
  });

  test('handles Windows line endings', () => {
    expect(parseParkingCsv(csv.replace(/\n/g, '\r\n'))).toEqual(decks);
  });
});

describe('status thresholds', () => {
  test.each([
    [160, 'Green'],  // exactly 20% free
    [161, 'Yellow'], // 19.5% free
    [190, 'Yellow'], // exactly 5% free
    [191, 'Red'],    // 4.5% free
    [200, 'Red'],    // full
  ])('%i of 200 occupied -> %s', (occupied, status) => {
    expect(availabilityStatus({ ...base, occupiedSpaces: occupied })).toBe(status);
  });

  test('zero capacity is Unavailable, not a divide-by-zero', () => {
    expect(availabilityStatus({ ...base, totalCapacity: 0, occupiedSpaces: 0 })).toBe('Unavailable');
  });

  test('over-capacity occupancy clamps available to 0', () => {
    expect(availableSpaces({ ...base, occupiedSpaces: 250 })).toBe(0);
  });

  test('NaN occupancy is treated as unavailable', () => {
    expect(availableSpaces({ ...base, occupiedSpaces: NaN })).toBeNull();
  });
});

describe('parseParkingCsv', () => {
  test('isDataAvailable=true with blank occupancy is still unavailable', () => {
    const [deck] = parseParkingCsv('id,name,location,totalCapacity,occupiedSpaces,isDataAvailable\nD1,X,Y,100,,true');
    expect(deck.isDataAvailable).toBe(false);
    expect(deck.occupiedSpaces).toBeNull();
  });

  test('converts numbers and ignores blank trailing lines', () => {
    const decks = parseParkingCsv('id,name,location,totalCapacity,occupiedSpaces,isDataAvailable\nD1,X,Y,100,40,true\n\n');
    expect(decks).toHaveLength(1);
    expect(decks[0]).toMatchObject({ totalCapacity: 100, occupiedSpaces: 40, isDataAvailable: true });
  });
});

describe('simulateOccupancy', () => {
  test('never goes below zero', () => {
    const [deck] = simulateOccupancy([{ ...base, occupiedSpaces: 3 }], () => 0); // delta -10
    expect(deck.occupiedSpaces).toBe(0);
  });

  test('changes by at most 10 and stamps lastUpdated', () => {
    const [deck] = simulateOccupancy([base], () => 0.5); // delta 0..: floor(10.5)-10 = 0
    expect(Math.abs(deck.occupiedSpaces - 100)).toBeLessThanOrEqual(10);
    expect(deck.lastUpdated).toBeTruthy();
  });

  test('skips decks without data', () => {
    const missing = { ...base, occupiedSpaces: null, isDataAvailable: false };
    expect(simulateOccupancy([missing], () => 0)[0]).toBe(missing);
  });

  test('leaves a deck alone when the random roll is above 0.75', () => {
    expect(simulateOccupancy([base], () => 0.9)[0]).toBe(base);
  });

  test('does not mutate the input', () => {
    const input = [{ ...base }];
    simulateOccupancy(input, () => 0);
    expect(input[0].occupiedSpaces).toBe(100);
  });
});

describe('PATS helpers', () => {
  test('occupancyLevel follows the driver color thresholds', () => {
    expect(occupancyLevel({ ...base, occupiedSpaces: 160 })).toBe('Normal');
    expect(occupancyLevel({ ...base, occupiedSpaces: 161 })).toBe('Approaching capacity');
    expect(occupancyLevel({ ...base, occupiedSpaces: 191 })).toBe('At capacity');
    expect(occupancyLevel({ ...base, occupiedSpaces: null, isDataAvailable: false })).toBe('No data');
  });

  test('sensorHealth reports online, stale and offline', () => {
    expect(sensorHealth({ ...base, sensorStatus: 'online' })).toBe('Online');
    expect(sensorHealth(base)).toBe('Online');
    expect(sensorHealth({ ...base, sensorStatus: 'stale' })).toBe('Stale');
    expect(sensorHealth({ ...base, sensorStatus: 'offline' })).toBe('Offline');
    expect(sensorHealth({ ...base, occupiedSpaces: null, isDataAvailable: false })).toBe('Offline');
  });

  test('stale sensors stop updating during simulation', () => {
    const stale = { ...base, sensorStatus: 'stale' };
    expect(simulateOccupancy([stale], () => 0)[0]).toBe(stale);
  });

  test('shipped CSV marks West Deck stale and defaults missing sensor status to online', () => {
    expect(parseParkingCsv(csv).map(d => d.sensorStatus)).toEqual(['online', 'online', 'online', 'online', 'online', 'stale']);
    expect(parseParkingCsv('id,name,location,totalCapacity,occupiedSpaces,isDataAvailable\nD1,X,Y,100,40,true')[0].sensorStatus).toBe('online');
  });
});
