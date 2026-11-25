import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ParkingFlow from './ParkingFlow.jsx';
import spotsCsv from '../../public/data/spots.csv?raw';

const deck = {
  id: 'D01',
  name: 'Main Deck',
  location: 'Main campus',
  totalCapacity: 300,
  occupiedSpaces: 45,
  isDataAvailable: true
};

const eastDeck = { ...deck, id: 'D03', name: 'East Deck 2' };

const spotButtons = () =>
  screen.getAllByRole('button').filter(b => /^\d[A-Z]-\d\d/.test(b.textContent));

const spotIds = buttons => buttons.map(b => b.textContent.slice(0, 5));

const freeSpots = () =>
  spotIds(spotButtons().filter(b => !b.disabled));

function mockSpots(ok = true) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      text: () => Promise.resolve(spotsCsv)
    })
  );
}

async function renderFlow(d = deck, onBack = () => {}) {
  const view = render(<ParkingFlow deck={d} onBack={onBack} />);
  await waitFor(() =>
    expect(screen.queryByText('Loading individual spaces...')).toBeNull()
  );
  return view;
}

beforeEach(() => mockSpots());

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('renders nothing without a deck', () => {
  const { container } = render(
    <ParkingFlow deck={undefined} onBack={() => {}} />
  );

  expect(container.innerHTML).toBe('');
});

describe('spots by level and section', () => {
  test('shows Level 1 sections A and B with labelled spots from spots.csv', async () => {
    await renderFlow();

    expect(
      screen.getByRole('button', { name: 'Level 1' }).getAttribute('aria-pressed')
    ).toBe('true');

    expect(screen.getByText('Section A')).toBeTruthy();
    expect(screen.getByText('Section B')).toBeTruthy();

    expect(spotIds(spotButtons())).toEqual([
      '1A-01',
      '1A-02',
      '1A-03',
      '1A-04',
      '1B-01',
      '1B-02',
      '1B-03',
      '1B-04'
    ]);

    expect(freeSpots()).toEqual([
      '1A-02',
      '1A-04',
      '1B-01',
      '1B-04'
    ]);

    expect(screen.getAllByText('2 of 4 free')).toHaveLength(2);
  });

  test('switching level shows that level’s spots', async () => {
    await renderFlow();

    await userEvent.click(
      screen.getByRole('button', { name: 'Level 2' })
    );

    expect(spotIds(spotButtons())[0]).toBe('2A-01');

    expect(freeSpots()).toEqual([
      '2A-01',
      '2A-02',
      '2A-03',
      '2A-04',
      '2B-02',
      '2B-03'
    ]);
  });

  test('a full level says so', async () => {
    await renderFlow(eastDeck);

    await userEvent.click(
      screen.getByRole('button', { name: 'Level 2' })
    );

    expect(
      screen.getByText('No open spaces on Level 2. Try another level.')
    ).toBeTruthy();

    expect(freeSpots()).toEqual([]);
  });

  test('deck without spot data shows a message and cannot continue', async () => {
    await renderFlow({
      ...deck,
      id: 'D99',
      name: 'New Deck'
    });

    expect(
      screen.getByText(/Individual-space data is unavailable for this deck/)
    ).toBeTruthy();

    expect(spotButtons()).toEqual([]);

    expect(
      screen.queryByText('Select a green spot below')
    ).toBeNull();

    expect(
      screen.getByRole('button', { name: /Continue with a spot/ }).disabled
    ).toBe(true);
  });

  test('West Deck has spot data and its one free spot can be picked', async () => {
    await renderFlow({
      ...deck,
      id: 'D06',
      name: 'West Deck',
      totalCapacity: 400,
      occupiedSpaces: 392
    });

    expect(freeSpots()).toEqual(['1A-04']);
  });

  test('failed spot data load shows the same message', async () => {
    mockSpots(false);

    await renderFlow();

    expect(
      screen.getByText(/Individual-space data is unavailable for this deck/)
    ).toBeTruthy();
  });

  test('deck without occupancy data disables every spot', async () => {
    await renderFlow({
      ...deck,
      occupiedSpaces: null,
      isDataAvailable: false
    });

    expect(screen.getByText('Occupancy data unavailable.')).toBeTruthy();
    expect(freeSpots()).toEqual([]);
  });

  test('clicking a taken spot does not select it', async () => {
    await renderFlow();

    const taken = screen.getByRole('button', { name: /1A-01/ });

    await userEvent.click(taken);

    expect(screen.getByText('Select a green spot below')).toBeTruthy();
    expect(taken.getAttribute('aria-pressed')).toBe('false');
  });

  test('spot statuses refresh every 30 seconds', async () => {
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval']
    });

    await act(async () => {
      render(<ParkingFlow deck={deck} onBack={() => {}} />);
      await new Promise(r => setTimeout(r, 0));
    });

    vi.spyOn(Math, 'random').mockReturnValue(0);

    await act(() => vi.advanceTimersByTime(30000));

    expect(freeSpots()).toEqual([
      '1A-01',
      '1A-03',
      '1B-02',
      '1B-03'
    ]);
  });
});

describe('selected spot becomes unavailable', () => {
  const alternativeIds = () =>
    screen
      .getAllByRole('button', { name: /SELECT · LEVEL/ })
      .map(b => b.textContent.slice(0, 5));

  // Selects 1A-02, optionally continues to confirmation, then makes it unavailable.
  async function selectThenTake({ confirm = false } = {}) {
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval']
    });

    await act(async () => {
      render(<ParkingFlow deck={deck} onBack={() => {}} />);
      await new Promise(r => setTimeout(r, 0));
    });

    await act(async () => {
      screen.getByRole('button', { name: /1A-02/ }).click();
    });

    expect(screen.getByText('✓ You selected 1A-02')).toBeTruthy();

    if (confirm) {
      await act(async () => {
        screen.getByRole('button', { name: /Continue with 1A-02/ }).click();
      });
    }

    vi.spyOn(Math, 'random').mockReturnValue(0);

    await act(() => vi.advanceTimersByTime(30000));
  }

  test('while choosing, shows the unavailable screen with same-floor alternatives first', async () => {
    await selectThenTake();

    expect(screen.getByText('Oops! Spot 1A-02 is unavailable.')).toBeTruthy();
    expect(screen.getByText('Available alternative spots')).toBeTruthy();

    expect(alternativeIds()).toEqual([
      '1A-01',
      '1A-03',
      '1B-02',
      '1B-03',
      '2B-01',
      '2B-04'
    ]);
  });

  test('while confirming, also moves to the unavailable screen', async () => {
    await selectThenTake({ confirm: true });

    expect(screen.queryByText('Spot 1A-02 is shown as free')).toBeNull();
    expect(screen.getByText('Oops! Spot 1A-02 is unavailable.')).toBeTruthy();
  });

  test('picking an alternative goes straight to confirm with that spot and level', async () => {
    await selectThenTake();

    await act(async () => {
      screen.getByRole('button', { name: /2B-01/ }).click();
    });

    expect(screen.getByText('Spot 2B-01 is shown as free')).toBeTruthy();
    expect(
      screen.getByText('Main Deck · Level 2', { selector: 'span' })
    ).toBeTruthy();

    expect(screen.getByRole('button', { name: /Tap in/ }).disabled).toBe(false);
  });

  test('"Choose another spot manually" returns to the picker with nothing selected', async () => {
    await selectThenTake();

    await act(async () => {
      screen.getByRole('button', {
        name: 'Choose another spot manually'
      }).click();
    });

    expect(screen.getByText('Choose an available spot')).toBeTruthy();
    expect(screen.getByText('Select a green spot below')).toBeTruthy();

    expect(
      screen.getByRole('button', { name: /Continue with a spot/ }).disabled
    ).toBe(true);
  });
  });
