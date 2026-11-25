import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App.jsx';
import spotsCsv from '../public/data/spots.csv?raw';

const decks = [
  {
    id: 'D01',
    name: 'Main Deck',
    location: 'East campus',
    totalCapacity: 300,
    occupiedSpaces: 45,
    availableSpaces: 255,
    occupancy: 15,
    status: 'Green',
    isDataAvailable: true,
    sensorStatus: 'online',
    lastUpdated: '2026-11-15T20:00:00-05:00',
    dataType: 'database'
  },
  {
    id: 'D02',
    name: 'Union Deck',
    location: 'Student Union',
    totalCapacity: 1200,
    occupiedSpaces: 1180,
    availableSpaces: 20,
    occupancy: 98.33,
    status: 'Red',
    isDataAvailable: true,
    sensorStatus: 'online',
    lastUpdated: '2026-11-15T20:00:00-05:00',
    dataType: 'database'
  },
  {
    id: 'D03',
    name: 'East Deck 2',
    location: 'East campus',
    totalCapacity: 650,
    occupiedSpaces: 560,
    availableSpaces: 90,
    occupancy: 86.15,
    status: 'Yellow',
    isDataAvailable: true,
    sensorStatus: 'online',
    lastUpdated: '2026-11-15T20:00:00-05:00',
    dataType: 'database'
  },
  {
    id: 'D04',
    name: 'North Deck',
    location: 'North campus',
    totalCapacity: 600,
    occupiedSpaces: 40,
    availableSpaces: 560,
    occupancy: 6.67,
    status: 'Green',
    isDataAvailable: true,
    sensorStatus: 'online',
    lastUpdated: '2026-11-15T20:00:00-05:00',
    dataType: 'database'
  },
  {
    id: 'D05',
    name: 'South Village Deck',
    location: 'South campus',
    totalCapacity: 800,
    occupiedSpaces: 560,
    availableSpaces: 240,
    occupancy: 70,
    status: 'Green',
    isDataAvailable: true,
    sensorStatus: 'online',
    lastUpdated: '2026-11-15T20:00:00-05:00',
    dataType: 'database'
  },
  {
    id: 'D06',
    name: 'West Deck',
    location: 'West campus area',
    totalCapacity: 400,
    occupiedSpaces: 392,
    availableSpaces: 8,
    occupancy: 98,
    status: 'Red',
    isDataAvailable: true,
    sensorStatus: 'stale',
    lastUpdated: '2026-11-15T20:00:00-05:00',
    dataType: 'database'
  }
];

function mockFetch(ok = true, body = decks) {
  globalThis.fetch = vi.fn(url =>
    Promise.resolve(
      url.includes('spots')
        ? {
            ok: true,
            text: () => Promise.resolve(spotsCsv)
          }
        : {
            ok,
            json: () => Promise.resolve(body)
          }
    )
  );
}

const cards = () =>
  screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);

const card = name =>
  screen.getByRole('heading', { name }).closest('article');

beforeEach(() => {
  mockFetch();
  window.scrollTo = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('shows every deck with capacity, available spaces and totals', async () => {
  render(<App />);

  await screen.findByText('Main Deck');

  expect(cards()).toHaveLength(6);
  expect(within(card('Main Deck')).getByText('255')).toBeTruthy();
  expect(within(card('Main Deck')).getByText('300')).toBeTruthy();
  expect(within(card('Union Deck')).getByText('Almost full')).toBeTruthy();
  expect(within(card('East Deck 2')).getByText('Limited spaces')).toBeTruthy();
  expect(screen.getByText('1,173')).toBeTruthy();
  expect(screen.getByText('6/6')).toBeTruthy();

  expect(fetch).toHaveBeenCalledWith(
    'http://127.0.0.1:5000/api/decks'
  );
});

test('search filters by name or location, and clearing restores the list', async () => {
  const user = userEvent.setup();

  render(<App />);

  await screen.findByText('Main Deck');

  const box = screen.getByRole('searchbox');

  await user.type(box, 'union');
  expect(cards()).toEqual(['Union Deck']);

  await user.clear(box);
  await user.type(box, 'South campus');
  expect(cards()).toEqual(['South Village Deck']);

  await user.clear(box);
  await user.type(box, 'zzz');

  expect(
    screen.getByText('No parking decks match that search.')
  ).toBeTruthy();

  await user.clear(box);
  expect(cards()).toHaveLength(6);
});

test('only one deck’s details are open at a time', async () => {
  const user = userEvent.setup();

  render(<App />);

  await screen.findByText('Main Deck');

  await user.click(
    within(card('Main Deck')).getByRole('button', {
      name: /View details/
    })
  );

  expect(
    within(card('Main Deck')).getByText(/Occupied spaces:/)
  ).toBeTruthy();

  await user.click(
    within(card('West Deck')).getByRole('button', {
      name: /View details/
    })
  );

  expect(
    within(card('Main Deck')).queryByText(/Occupied spaces:/)
  ).toBeNull();

  await user.click(
    within(card('West Deck')).getByRole('button', {
      name: /Hide details/
    })
  );

  expect(screen.queryByText(/Occupied spaces:/)).toBeNull();
});

test('failed API load shows an error, not numbers', async () => {
  mockFetch(false);

  render(<App />);

  await screen.findByText(
    'Parking data is temporarily unavailable. Please try again later.'
  );

  expect(
    screen.queryAllByRole('heading', { level: 3 })
  ).toHaveLength(0);
});

test('deck with no occupancy data shows the unavailable message', async () => {
  mockFetch(true, [
    {
      id: 'D9',
      name: 'Ghost Deck',
      location: 'Nowhere',
      totalCapacity: 500,
      occupiedSpaces: null,
      availableSpaces: null,
      isDataAvailable: false,
      lastUpdated: '2026-11-15T20:00:00-05:00',
      sensorStatus: 'offline',
      dataType: 'database'
    }
  ]);

  render(<App />);

  await screen.findByText('Ghost Deck');

  expect(
    screen.getByText('Occupancy data is currently unavailable.')
  ).toBeTruthy();

  expect(screen.getByText('0/1')).toBeTruthy();
});

test('occupancy refreshes automatically every 30 seconds', async () => {
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval']
  });

  mockFetch();

  render(<App />);

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(fetch).toHaveBeenCalledTimes(1);

  await act(async () => {
    vi.advanceTimersByTime(30000);
  });

  expect(fetch).toHaveBeenCalledTimes(2);
});

test('shows available individual parking spot data', async () => {
  const user = userEvent.setup();

  render(<App />);

  await screen.findByText('Main Deck');

  await user.click(
    within(card('Main Deck')).getByRole('button', {
      name: /Choose deck/
    })
  );

  const flow = () =>
    within(
      screen.getByRole('region', {
        name: 'Parking simulation'
      })
    );

  // Check that spot 1A-02 is available.
  const availableSpot = flow().getByRole('button', {
    name: /1A-02/
  });

  expect(availableSpot.textContent).toContain('FREE');

  // Select the available parking spot.
  await user.click(availableSpot);

  // Confirm the selected spot can be continued with.
  expect(
    flow().getByRole('button', {
      name: /Continue with 1A-02/
    }).disabled
  ).toBe(false);
});

test('shows the color key and a per-deck update time', async () => {
  render(<App />);

  await screen.findByText('Main Deck');

  expect(
    screen.getByRole('list', {
      name: 'Availability color key'
    })
  ).toBeTruthy();

  expect(
    within(card('Main Deck')).getByText(/^Updated /)
  ).toBeTruthy();
});

test('Nearby parking tab finds decks near a building and opens the chosen one', async () => {
  const user = userEvent.setup();

  render(<App />);

  await screen.findByText('Main Deck');

  await user.click(
    screen.getByRole('button', {
      name: 'Nearby parking'
    })
  );

  await user.selectOptions(
    screen.getByRole('combobox', {
      name: 'Destination building'
    }),
    'Student Union'
  );

  const first = screen.getAllByRole('listitem')[0];

  expect(
    within(first).getByText('Union Deck')
  ).toBeTruthy();

  await user.click(
    within(first).getByRole('button', {
      name: /View deck/
    })
  );

  expect(
    screen.getByRole('region', {
      name: 'Parking simulation'
    })
  ).toBeTruthy();

  expect(
    screen.getByText('Union Deck', {
      selector: '.eyebrow'
    })
  ).toBeTruthy();

  expect(window.scrollTo).toHaveBeenCalled();
});