import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useParkingAvailability } from './useParkingAvailability.js';

// waitFor polls with setInterval, which these tests fake; a real setTimeout lets the fetch chain finish.
const settle = () => act(() => new Promise(r => setTimeout(r, 0)));
const apiDecks = [
  {
    id: 'DB-ONLY',
    name: 'Persisted Test Deck',
    location: 'Database campus',
    totalCapacity: 80,
    occupiedSpaces: 17,
    availableSpaces: 63,
    occupancy: 21.25,
    status: 'Green',
    lastUpdated: '2026-11-15T20:00:00-05:00',
    isDataAvailable: true,
    dataType: 'database',
    sensorStatus: 'online',
  },
];
const respond = (ok = true, data = apiDecks) =>
  Promise.resolve({ ok, json: () => Promise.resolve(data) });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('loads and maps API decks, then returns a refresh time', async () => {
  globalThis.fetch = vi.fn(() => respond());
  const { result } = renderHook(() => useParkingAvailability());
  expect(result.current).toMatchObject({ loading: true, decks: [], error: '', stale: false, lastRefresh: null });

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5000/api/decks', expect.objectContaining({ cache: 'no-store' }));
  expect(result.current.decks).toEqual([
    {
      id: 'DB-ONLY',
      name: 'Persisted Test Deck',
      location: 'Database campus',
      totalCapacity: 80,
      occupiedSpaces: 17,
      isDataAvailable: true,
      lastUpdated: '2026-11-15T20:00:00-05:00',
      sensorStatus: 'online',
    },
  ]);
  expect(result.current.lastRefresh).toBeInstanceOf(Date);
  expect(result.current.error).toBe('');
});

test('maps unavailable API occupancy to null', async () => {
  globalThis.fetch = vi.fn(() => respond(true, [{
    ...apiDecks[0],
    occupiedSpaces: null,
    availableSpaces: null,
    isDataAvailable: false,
  }]));
  const { result } = renderHook(() => useParkingAvailability());

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.decks[0]).toMatchObject({
    occupiedSpaces: null,
    isDataAvailable: false,
  });
});

test('network failure sets the friendly error', async () => {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  const { result } = renderHook(() => useParkingAvailability());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Parking data is temporarily unavailable. Please try again later.');
  expect(result.current.decks).toEqual([]);
});

test('keeps retrying after a failed first load and recovers when the API is back', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  globalThis.fetch = vi.fn(() => respond(false));
  const { result } = renderHook(() => useParkingAvailability());
  await settle();
  expect(result.current.error).not.toBe('');

  globalThis.fetch = vi.fn(() => respond());
  await act(() => vi.advanceTimersByTime(30000));
  await settle();
  expect(result.current.error).toBe('');
  expect(result.current.decks[0].occupiedSpaces).toBe(17);
});

test('each refresh pulls the latest occupancy from the API instead of simulating it', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  const random = vi.spyOn(Math, 'random');
  globalThis.fetch = vi.fn(() => respond());
  const { result } = renderHook(() => useParkingAvailability());
  await settle();
  expect(result.current.decks[0].occupiedSpaces).toBe(17);

  globalThis.fetch = vi.fn(() => respond(true, [{ ...apiDecks[0], occupiedSpaces: 30 }]));
  await act(() => vi.advanceTimersByTime(30000));
  await settle();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(result.current.decks[0].occupiedSpaces).toBe(30);
  expect(random).not.toHaveBeenCalled();
});

test('a failed refresh keeps the last good decks and marks them stale', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  globalThis.fetch = vi.fn(() => respond());
  const { result } = renderHook(() => useParkingAvailability());
  await settle();
  const loadedAt = result.current.lastRefresh;

  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  await act(() => vi.advanceTimersByTime(30000));
  await settle();
  expect(result.current).toMatchObject({ error: '', stale: true, lastRefresh: loadedAt });
  expect(result.current.decks[0].occupiedSpaces).toBe(17);

  globalThis.fetch = vi.fn(() => respond());
  await act(() => vi.advanceTimersByTime(30000));
  await settle();
  expect(result.current.stale).toBe(false);
  expect(result.current.lastRefresh).not.toBe(loadedAt);
});

test('a malformed API response is treated as a failure', async () => {
  globalThis.fetch = vi.fn(() => respond(true, { error: 'nope' }));
  const { result } = renderHook(() => useParkingAvailability());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).not.toBe('');
});

test('does not send a second request while one is still pending', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  globalThis.fetch = vi.fn(() => new Promise(() => {}));
  renderHook(() => useParkingAvailability());
  await act(() => vi.advanceTimersByTime(60000));
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('refresh updates lastRefresh every 30 seconds', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  globalThis.fetch = vi.fn(() => respond());
  const { result } = renderHook(() => useParkingAvailability());
  await settle();
  expect(result.current.loading).toBe(false);
  const first = result.current.lastRefresh;

  await act(() => vi.advanceTimersByTime(29999));
  expect(result.current.lastRefresh).toBe(first);
  await act(() => vi.advanceTimersByTime(1));
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
  globalThis.fetch = vi.fn(() => new Promise(r => { resolve = r; }));
  const { result, unmount } = renderHook(() => useParkingAvailability());
  unmount();
  await act(async () => resolve({ ok: true, json: () => Promise.resolve(apiDecks) }));
  expect(result.current.decks).toEqual([]);
  expect(errors).not.toHaveBeenCalled();
});
