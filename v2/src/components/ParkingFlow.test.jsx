import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ParkingFlow from './ParkingFlow.jsx';

const deck = { id: 'D1', name: 'Main Deck', location: 'Main campus', totalCapacity: 300, occupiedSpaces: 45, isDataAvailable: true };
const spotButtons = () => screen.getAllByRole('button').filter(b => /^A\d/.test(b.textContent));
const freeSpots = () => spotButtons().filter(b => !b.disabled).map(b => b.textContent.slice(0, 2));

afterEach(() => vi.useRealTimers());

test('renders nothing without a deck', () => {
  const { container } = render(<ParkingFlow deck={undefined} onBack={() => {}} />);
  expect(container.innerHTML).toBe('');
});

describe('demo spots', () => {
  test('shows six spots A1–A6 with A6 always free when space is available', () => {
    render(<ParkingFlow deck={deck} onBack={() => {}} />);
    expect(spotButtons().map(b => b.textContent.slice(0, 2))).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
    expect(freeSpots()).toContain('A6');
  });

  test('full deck has no free spots and cannot continue', () => {
    render(<ParkingFlow deck={{ ...deck, occupiedSpaces: 300 }} onBack={() => {}} />);
    expect(freeSpots()).toEqual([]);
    expect(screen.getByRole('button', { name: /Continue with a spot/ }).disabled).toBe(true);
  });

  test('deck without data says so and disables every spot', () => {
    render(<ParkingFlow deck={{ ...deck, occupiedSpaces: null, isDataAvailable: false }} onBack={() => {}} />);
    expect(screen.getByText('Occupancy data unavailable.')).toBeTruthy();
    expect(freeSpots()).toEqual([]);
  });

  test('clicking a taken spot does not select it', async () => {
    render(<ParkingFlow deck={deck} onBack={() => {}} />);
    const taken = spotButtons().find(b => b.disabled);
    await userEvent.click(taken);
    expect(screen.getByText('Select a green spot below')).toBeTruthy();
    expect(taken.getAttribute('aria-pressed')).toBe('false');
  });

  test('selecting a different free spot moves the selection', async () => {
    render(<ParkingFlow deck={deck} onBack={() => {}} />);
    const [first, ...rest] = spotButtons().filter(b => !b.disabled);
    await userEvent.click(first);
    await userEvent.click(rest.at(-1));
    expect(first.getAttribute('aria-pressed')).toBe('false');
    expect(rest.at(-1).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('session flow', () => {
  async function parkAtA6(user) {
    await user.click(screen.getByRole('button', { name: /A6/ }));
    await user.click(screen.getByRole('button', { name: /Continue with A6/ }));
    await user.click(screen.getByRole('button', { name: /Tap in/ }));
  }

  test('summary shows deck, spot and duration in minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-06T10:00:00'));
    const user = userEvent.setup();
    render(<ParkingFlow deck={deck} onBack={() => {}} />);
    await parkAtA6(user);

    vi.setSystemTime(new Date('2026-11-06T11:25:00'));
    await user.click(screen.getByRole('button', { name: /Tap out/ }));
    const summary = screen.getByText('Thanks for trying SmartPark!').parentElement.textContent;
    expect(summary).toContain('Main Deck');
    expect(summary).toContain('A6 · Level 1');
    expect(summary).toContain('85 minutes');
  });

  test('"Back to all decks" on the summary calls onBack', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<ParkingFlow deck={deck} onBack={onBack} />);
    await parkAtA6(user);
    await user.click(screen.getByRole('button', { name: /Tap out/ }));
    await user.click(screen.getByRole('button', { name: 'Back to all decks' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  test('switching to another deck resets the flow', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ParkingFlow deck={deck} onBack={() => {}} />);
    await parkAtA6(user);
    expect(screen.getByText("✓ You're parked (demo)")).toBeTruthy();

    rerender(<ParkingFlow deck={{ ...deck, id: 'D4', name: 'North Deck' }} onBack={() => {}} />);
    expect(screen.getByText('Choose an available spot')).toBeTruthy();
    expect(screen.getByText('North Deck · Level 1')).toBeTruthy();
    expect(screen.getByText('Select a green spot below')).toBeTruthy();
  });
});
