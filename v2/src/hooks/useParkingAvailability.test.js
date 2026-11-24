
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useParkingAvailability } from './useParkingAvailability.js';

const decks = [
  {
    id: 'D01',
    name: 'Main Deck',
    location: 'Main Campus',
    totalCapacity: 300,
    occupiedSpaces: 45,
    isDataAvailable: true,
  },
  {
    id: 'D02',
    name: 'Union Deck',
    location: 'Union',
    totalCapacity: 1200,
    occupiedSpaces: 1180,
    isDataAvailable: true,
  },
  {
    id: 'D03',
    name: 'East Deck 2',
    location: 'East Campus',
    totalCapacity: 650,
    occupiedSpaces: 560,
    isDataAvailable: true,
  },
  {
    id: 'D04',
    name: 'North Deck',
    location: 'North Campus',
    totalCapacity: 600,
    occupiedSpaces: 40,
    isDataAvailable: true,
  },
  {
    id: 'D05',
    name: 'South Village Deck',
    location: 'South Village',
    totalCapacity: 800,
    occupiedSpaces: 560,
    isDataAvailable: true,
  },
  {
    id: 'D06',
    name: 'West Deck',
    location: 'West Campus',
    totalCapacity: 400,
    occupiedSpaces: 392,
    isDataAvailable: true,
  },
];

const settle = () => act(() => new Promise(resolve => setTimeout(resolve, 0)));

const respond = (ok = true) =>
  Promise.resolve({
    ok,
    json: () => Promise.resolve(decks),
  });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('starts loading, then returns decks and a refresh time', async () => {
  globalThis.fetch = vi.fn(() => respond());

  const { result } = renderHook(() => useParkingAvailability());

  expect(result.current).toMatchObject({
    loading: true,
    decks: [],
    error: '',
    lastRefresh: null,
  });

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.decks).toHaveLength(6);
  expect(result.current.lastRefresh).toBeInstanceOf(Date);
  expect(result.current.error).toBe('');
});

test('network failure sets the friendly error', async () => {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));

  const { result } = renderHook(() => useParkingAvailability());

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBe(
    'Parking data is temporarily unavailable. Please try again later.'
  );
  expect(result.current.decks).toEqual([]);
});

test('refreshes parking data every 30 seconds', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  globalThis.fetch = vi.fn(() => respond());

  const { result } = renderHook(() => useParkingAvailability());

  await settle();

  expect(result.current.loading).toBe(false);
  const first = result.current.lastRefresh;

  await act(() => vi.advanceTimersByTime(29999));
  expect(result.current.lastRefresh).toBe(first);

  await act(() => vi.advanceTimersByTime(1));
  await settle();

  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  expect(result.current.lastRefresh).not.toBe(first);
});

test('unmounting stops the refresh timer', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  const clear = vi.spyOn(globalThis, 'clearInterval');
  globalThis.fetch = vi.fn(() => respond());

  const { result, unmount } = renderHook(() => useParkingAvailability());

  await settle();
  expect(result.current.loading).toBe(false);

  unmount();

  expect(clear).toHaveBeenCalled();
});

test('unmounting before the API response does not update state', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  let resolve;

  globalThis.fetch = vi.fn(
    () => new Promise(resolvePromise => {
      resolve = resolvePromise;
    })
  );

  const { result, unmount } = renderHook(() => useParkingAvailability());

  unmount();

  await act(async () => {
    resolve({
      ok: true,
      json: () => Promise.resolve(decks),
    });
  });

  expect(result.current.decks).toEqual([]);
  expect(errors).not.toHaveBeenCalled();
});
