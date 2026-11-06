import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ParkingFlow from './ParkingFlow.jsx';
import spotsCsv from '../../public/data/spots.csv?raw';

const deck = { id: 'D01', name: 'Main Deck', location: 'Main campus', totalCapacity: 300, occupiedSpaces: 45, isDataAvailable: true };
const eastDeck = { ...deck, id: 'D03', name: 'East Deck 2' };
const spotButtons = () => screen.getAllByRole('button').filter(b => /^\d[A-Z]-\d\d/.test(b.textContent));
const spotIds = buttons => buttons.map(b => b.textContent.slice(0, 5));
const freeSpots = () => spotIds(spotButtons().filter(b => !b.disabled));

function mockSpots(ok = true) {
  globalThis.fetch = vi.fn(() => Promise.resolve({ ok, text: () => Promise.resolve(spotsCsv) }));
}
async function renderFlow(d = deck, onBack = () => {}) {
  const view = render(<ParkingFlow deck={d} onBack={onBack} />);
  await waitFor(() => expect(screen.queryByText('Loading individual spaces...')).toBeNull());
  return view;
}

beforeEach(() => mockSpots());
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

test('renders nothing without a deck', () => {
  const { container } = render(<ParkingFlow deck={undefined} onBack={() => {}} />);
  expect(container.innerHTML).toBe('');
});

describe('spots by level and section', () => {
  test('shows Level 1 sections A and B with labelled spots from spots.csv', async () => {
    await renderFlow();
    expect(screen.getByRole('button', { name: 'Level 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Section A')).toBeTruthy();
    expect(screen.getByText('Section B')).toBeTruthy();
    expect(spotIds(spotButtons())).toEqual(['1A-01', '1A-02', '1A-03', '1A-04', '1B-01', '1B-02', '1B-03', '1B-04']);
    expect(freeSpots()).toEqual(['1A-02', '1A-04', '1B-01', '1B-04']);
    expect(screen.getAllByText('2 of 4 free')).toHaveLength(2);
  });

  test('switching level shows that level’s spots', async () => {
    await renderFlow();
    await userEvent.click(screen.getByRole('button', { name: 'Level 2' }));
    expect(spotIds(spotButtons())[0]).toBe('2A-01');
    expect(freeSpots()).toEqual(['2A-01', '2A-02', '2A-03', '2A-04', '2B-02', '2B-03']);
  });

  test('a full level says so', async () => {
    await renderFlow(eastDeck);
    await userEvent.click(screen.getByRole('button', { name: 'Level 2' }));
    expect(screen.getByText('No open spaces on Level 2. Try another level.')).toBeTruthy();
    expect(freeSpots()).toEqual([]);
  });

  test('deck without spot data shows a message and cannot continue', async () => {
    await renderFlow({ ...deck, id: 'D02', name: 'Union Deck' });
    expect(screen.getByText(/Individual-space data is unavailable for this deck/)).toBeTruthy();
    expect(spotButtons()).toEqual([]);
    expect(screen.getByRole('button', { name: /Continue with a spot/ }).disabled).toBe(true);
  });

  test('failed spot data load shows the same message', async () => {
    mockSpots(false);
    await renderFlow();
    expect(screen.getByText(/Individual-space data is unavailable for this deck/)).toBeTruthy();
  });

  test('deck without occupancy data disables every spot', async () => {
    await renderFlow({ ...deck, occupiedSpaces: null, isDataAvailable: false });
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
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await act(async () => { render(<ParkingFlow deck={deck} onBack={() => {}} />); await new Promise(r => setTimeout(r, 0)); });
    vi.spyOn(Math, 'random').mockReturnValue(0); // every spot flips
    await act(() => vi.advanceTimersByTime(30000));
    expect(freeSpots()).toEqual(['1A-01', '1A-03', '1B-02', '1B-03']);
  });

  test('if the selected spot gets taken, it can no longer be continued with', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await act(async () => { render(<ParkingFlow deck={deck} onBack={() => {}} />); await new Promise(r => setTimeout(r, 0)); });
    await act(async () => screen.getByRole('button', { name: /1A-02/ }).click());
    expect(screen.getByText('✓ You selected 1A-02')).toBeTruthy();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByText('Select a green spot below')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Continue with 1A-02/ }).disabled).toBe(true);
  });
});

describe('session flow', () => {
  async function park(user, spot = '2A-03') {
    await user.click(screen.getByRole('button', { name: 'Level 2' }));
    await user.click(screen.getByRole('button', { name: new RegExp(spot) }));
    await user.click(screen.getByRole('button', { name: new RegExp(`Continue with ${spot}`) }));
    await user.click(screen.getByRole('button', { name: /Tap in/ }));
  }

  test('summary shows deck, spot, level and duration in minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-06T10:00:00'));
    const user = userEvent.setup();
    await renderFlow();
    await park(user);
    expect(screen.getByText('Main Deck · Level 2', { selector: 'span' })).toBeTruthy();

    vi.setSystemTime(new Date('2026-11-06T11:25:00'));
    await user.click(screen.getByRole('button', { name: /Tap out/ }));
    const summary = screen.getByText('Thanks for trying SmartPark!').parentElement.textContent;
    expect(summary).toContain('Main Deck');
    expect(summary).toContain('2A-03 · Level 2');
    expect(summary).toContain('85 minutes');
  });

  test('"Back to all decks" on the summary calls onBack', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    await renderFlow(deck, onBack);
    await park(user);
    await user.click(screen.getByRole('button', { name: /Tap out/ }));
    await user.click(screen.getByRole('button', { name: 'Back to all decks' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  test('switching to another deck resets the flow', async () => {
    const user = userEvent.setup();
    const { rerender } = await renderFlow();
    await park(user);
    expect(screen.getByText("✓ You're parked (demo)")).toBeTruthy();

    rerender(<ParkingFlow deck={{ ...deck, id: 'D05', name: 'South Village Deck' }} onBack={() => {}} />);
    expect(screen.getByText('Choose an available spot')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Level 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Select a green spot below')).toBeTruthy();
  });
});
