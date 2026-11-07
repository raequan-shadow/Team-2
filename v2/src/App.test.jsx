import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

import csv from '../public/data/parking.csv?raw';
import spotsCsv from '../public/data/spots.csv?raw';

function mockFetch(ok = true, body = csv) {
  globalThis.fetch = vi.fn(url => Promise.resolve(url.includes('spots')
    ? { ok: true, text: () => Promise.resolve(spotsCsv) }
    : { ok, text: () => Promise.resolve(body) }));
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
  expect(fetch).toHaveBeenCalledWith('/data/parking.csv');
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
  mockFetch(true, 'id,name,location,totalCapacity,occupiedSpaces,isDataAvailable\nD9,Ghost Deck,Nowhere,500,,false');
  render(<App />);
  await screen.findByText('Ghost Deck');
  expect(screen.getByText('Occupancy data is currently unavailable.')).toBeTruthy();
  expect(screen.getByText('0/1')).toBeTruthy();
});

test('occupancy refreshes automatically every 30 seconds', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  vi.spyOn(Math, 'random').mockReturnValue(0); // every deck loses 10 cars
  render(<App />);
  await screen.findByText('Main Deck');
  expect(within(card('Main Deck')).getByText('255')).toBeTruthy();

  await act(() => vi.advanceTimersByTime(30000));
  expect(within(card('Main Deck')).getByText('265')).toBeTruthy();
  vi.restoreAllMocks();
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

test('PATS staff tab requires sign-in and shows the occupancy dashboard', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText('Main Deck');
  await user.click(screen.getByRole('button', { name: 'PATS staff' }));
  expect(screen.queryByText('Find your next parking spot.')).toBeNull();

  await user.type(screen.getByLabelText('Staff PIN'), '3155');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  const dashboard = within(screen.getByRole('region', { name: 'PATS occupancy dashboard' }));
  expect(dashboard.getAllByRole('rowheader')).toHaveLength(6);
  expect(dashboard.getByText('Stale')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Find parking' }));
  expect(cards()).toHaveLength(6);
});
