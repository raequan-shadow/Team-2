import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

import spotsCsv from '../public/data/spots.csv?raw';
import { jsonResponse, spotsApiFromCsv } from './testUtils.js';

const apiDecks = [
  { id: 'D01', name: 'Main Deck', location: 'Main campus', totalCapacity: 300, occupiedSpaces: 45, availableSpaces: 255, occupancy: 15, status: 'Green', lastUpdated: '2026-11-15T20:00:00-05:00', isDataAvailable: true, dataType: 'database', sensorStatus: 'online' },
  { id: 'D02', name: 'Union Deck', location: 'Near Student Union', totalCapacity: 1200, occupiedSpaces: 1180, availableSpaces: 20, occupancy: 98.33, status: 'Red', lastUpdated: '2026-11-15T20:00:00-05:00', isDataAvailable: true, dataType: 'database', sensorStatus: 'online' },
  { id: 'D03', name: 'East Deck 2', location: 'East campus area', totalCapacity: 650, occupiedSpaces: 560, availableSpaces: 90, occupancy: 86.15, status: 'Yellow', lastUpdated: '2026-11-15T20:00:00-05:00', isDataAvailable: true, dataType: 'database', sensorStatus: 'online' },
  { id: 'D04', name: 'North Deck', location: 'North campus area', totalCapacity: 600, occupiedSpaces: 40, availableSpaces: 560, occupancy: 6.67, status: 'Green', lastUpdated: '2026-11-15T20:00:00-05:00', isDataAvailable: true, dataType: 'database', sensorStatus: 'online' },
  { id: 'D05', name: 'South Village Deck', location: 'South Village area', totalCapacity: 800, occupiedSpaces: 560, availableSpaces: 240, occupancy: 70, status: 'Green', lastUpdated: '2026-11-15T20:00:00-05:00', isDataAvailable: true, dataType: 'database', sensorStatus: 'online' },
  { id: 'D06', name: 'West Deck', location: 'West campus area', totalCapacity: 400, occupiedSpaces: 392, availableSpaces: 8, occupancy: 98, status: 'Red', lastUpdated: '2026-11-15T20:00:00-05:00', isDataAvailable: true, dataType: 'database', sensorStatus: 'stale' },
];

function mockFetch(ok = true, body = apiDecks) {
  globalThis.fetch = vi.fn(url => Promise.resolve(url.includes('spots')
    ? jsonResponse(spotsApiFromCsv(spotsCsv))
    : jsonResponse(body, ok)));
}

const cards = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
const card = name => screen.getByRole('heading', { name }).closest('article');

beforeEach(() => {
  mockFetch();
  window.scrollTo = vi.fn();
});
afterEach(() => vi.useRealTimers());

test('shows every deck with capacity, available spaces and totals', async () => {
  render(<App />);
  expect(screen.getByText('Loading demo parking data...')).toBeTruthy();
  await screen.findByText('Main Deck');
  expect(cards()).toHaveLength(6);
  expect(within(card('Main Deck')).getByText('255')).toBeTruthy();
  expect(within(card('Main Deck')).getByText('300')).toBeTruthy();
  expect(within(card('Union Deck')).getByText('Almost full')).toBeTruthy();
  expect(within(card('East Deck 2')).getByText('Limited spaces')).toBeTruthy();
  expect(screen.getByText('1,173')).toBeTruthy(); // 255+20+90+560+240+8
  expect(screen.getByText('6/6')).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5000/api/decks', expect.objectContaining({ cache: 'no-store' }));
});

test('search filters by name or location, and clearing restores the list', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText('Main Deck');
  const box = screen.getByRole('searchbox');

  await user.type(box, 'union');
  expect(cards()).toEqual(['Union Deck']);

  await user.clear(box);
  await user.type(box, 'EAST campus');
  expect(cards()).toEqual(['East Deck 2']);

  await user.clear(box);
  await user.type(box, 'zzz');
  expect(screen.getByText('No parking decks match that search.')).toBeTruthy();

  await user.clear(box);
  expect(cards()).toHaveLength(6);
});

test('only one deck’s details are open at a time', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText('Main Deck');
  await user.click(within(card('Main Deck')).getByRole('button', { name: /View details/ }));
  expect(within(card('Main Deck')).getByText(/Occupied spaces:/)).toBeTruthy();

  await user.click(within(card('West Deck')).getByRole('button', { name: /View details/ }));
  expect(within(card('Main Deck')).queryByText(/Occupied spaces:/)).toBeNull();

  await user.click(within(card('West Deck')).getByRole('button', { name: /Hide details/ }));
  expect(screen.queryByText(/Occupied spaces:/)).toBeNull();
});

test('failed CSV load shows an error, not numbers', async () => {
  mockFetch(false);
  render(<App />);
  await screen.findByText('Parking data is temporarily unavailable. Please try again later.');
  expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
});

test('deck with no occupancy data shows the unavailable message', async () => {
  mockFetch(true, [{
    id: 'D9',
    name: 'Ghost Deck',
    location: 'Nowhere',
    totalCapacity: 500,
    occupiedSpaces: null,
    availableSpaces: null,
    isDataAvailable: false,
    lastUpdated: '2026-11-15T20:00:00-05:00',
    sensorStatus: 'offline',
  }]);
  render(<App />);
  await screen.findByText('Ghost Deck');
  expect(screen.getByText('Occupancy data is currently unavailable.')).toBeTruthy();
  expect(screen.getByText('0/1')).toBeTruthy();
});

test('occupancy refreshes from the backend every 30 seconds', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  render(<App />);
  await screen.findByText('Main Deck');
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
  expect(within(card('Main Deck')).getByText('255')).toBeTruthy();

  // Another session parked 10 cars; the database now reports 55 occupied.
  mockFetch(true, apiDecks.map(d => d.id === 'D01' ? { ...d, occupiedSpaces: 55 } : d));
  await act(async () => { vi.advanceTimersByTime(30000); await new Promise(r => setTimeout(r, 0)); });
  expect(within(card('Main Deck')).getByText('245')).toBeTruthy();
});

test('a failed refresh keeps the last data and warns that it may be out of date', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  render(<App />);
  await screen.findByText('Main Deck');
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));

  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  await act(async () => { vi.advanceTimersByTime(30000); await new Promise(r => setTimeout(r, 0)); });
  expect(within(card('Main Deck')).getByText('255')).toBeTruthy();
  expect(screen.getByText(/couldn.t reach the parking server/i)).toBeTruthy();

  mockFetch();
  await act(async () => { vi.advanceTimersByTime(30000); await new Promise(r => setTimeout(r, 0)); });
  expect(screen.queryByText(/couldn.t reach the parking server/i)).toBeNull();
});

test('full driver flow: choose deck, pick spot, tap in, tap out, back to list', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText('Main Deck');
  await user.click(within(card('Main Deck')).getByRole('button', { name: /Choose deck/ }));

  const flow = () => within(screen.getByRole('region', { name: 'Parking simulation' }));
  expect(flow().getByText('255 spaces reported available across this deck.')).toBeTruthy();
  expect(flow().getByRole('button', { name: /Continue with a spot/ }).disabled).toBe(true);

  const taken = await flow().findByRole('button', { name: /1A-01/ });
  expect(taken.disabled).toBe(true);

  await user.click(flow().getByRole('button', { name: /1A-02/ }));
  expect(flow().getByText('✓ You selected 1A-02')).toBeTruthy();
  await user.click(flow().getByRole('button', { name: /Continue with 1A-02/ }));

  expect(flow().getByText('Spot 1A-02 is shown as free')).toBeTruthy();
  await user.click(flow().getByRole('button', { name: /Not here/ }));
  expect(flow().getByRole('button', { name: /Continue with a spot/ }).disabled).toBe(true);
  await user.click(flow().getByRole('button', { name: /1A-02/ }));
  await user.click(flow().getByRole('button', { name: /Continue with 1A-02/ }));

  await user.click(flow().getByRole('button', { name: /Tap in/ }));
  expect(flow().getByText("✓ You're parked (demo)")).toBeTruthy();

  await user.click(flow().getByRole('button', { name: /Tap out/ }));
  expect(flow().getByText('Thanks for trying SmartPark!')).toBeTruthy();
  expect(flow().getByText(/Duration:/).parentElement.textContent).toContain('0 minutes');

  await user.click(flow().getByRole('button', { name: 'See spots again' }));
  expect(flow().getByText('Choose an available spot')).toBeTruthy();

  await user.click(flow().getByRole('button', { name: /All parking decks/ }));
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Parking simulation' })).toBeNull());
  expect(cards()).toHaveLength(6);
});

test('shows the color key and a per-deck update time', async () => {
  render(<App />);
  await screen.findByText('Main Deck');
  expect(screen.getByRole('list', { name: 'Availability color key' })).toBeTruthy();
  expect(within(card('Main Deck')).getByText(/^Updated /)).toBeTruthy();
});

test('Nearby parking tab finds decks near a building and opens the chosen one', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText('Main Deck');
  await user.click(screen.getByRole('button', { name: 'Nearby parking' }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Destination building' }), 'Student Union');
  const first = screen.getAllByRole('listitem')[0];
  expect(within(first).getByText('Union Deck')).toBeTruthy();

  await user.click(within(first).getByRole('button', { name: /View deck/ }));
  expect(screen.getByRole('region', { name: 'Parking simulation' })).toBeTruthy();
  expect(screen.getByText('Union Deck', { selector: '.eyebrow' })).toBeTruthy();
  expect(window.scrollTo).toHaveBeenCalled();
});
