import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useParkingAvailability } from './useParkingAvailability.js';
import csv from '../../public/data/parking.csv?raw';

// waitFor polls with setInterval, which these tests fake; a real setTimeout lets the fetch chain finish.
const settle = () => act(() => new Promise(r => setTimeout(r, 0)));
const respond = (ok = true) => Promise.resolve({ ok, text: () => Promise.resolve(csv) });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('starts loading, then returns decks and a refresh time', async () => {
  globalThis.fetch = vi.fn(() => respond());
  const { result } = renderHook(() => useParkingAvailability());
  expect(result.current).toMatchObject({ loading: true, decks: [], error: '', lastRefresh: null });

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.decks).toHaveLength(6);
  expect(result.current.lastRefresh).toBeInstanceOf(Date);
  expect(result.current.error).toBe('');
});

test('network failure sets the friendly error', async () => {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  const { result } = renderHook(() => useParkingAvailability());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Parking data is temporarily unavailable. Please try again later.');
  expect(result.current.decks).toEqual([]);
});

test('does not start the refresh timer after an error', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  const spy = vi.spyOn(globalThis, 'setInterval');
  globalThis.fetch = vi.fn(() => respond(false));
  const { result } = renderHook(() => useParkingAvailability());
  await settle();
  expect(result.current.error).not.toBe('');
  expect(spy).not.toHaveBeenCalled();
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

test('unmounting before the CSV arrives does not update state', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  let resolve;
  globalThis.fetch = vi.fn(() => new Promise(r => { resolve = r; }));
  const { result, unmount } = renderHook(() => useParkingAvailability());
  unmount();
  await act(async () => resolve({ ok: true, text: () => Promise.resolve(csv) }));
  expect(result.current.decks).toEqual([]);
  expect(errors).not.toHaveBeenCalled();
});
