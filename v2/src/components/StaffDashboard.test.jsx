import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import StaffDashboard, { STAFF_PIN } from './StaffDashboard.jsx';

const deck = (id, name, totalCapacity, occupiedSpaces, extra = {}) =>
  ({ id, name, location: '', totalCapacity, occupiedSpaces, isDataAvailable: occupiedSpaces !== null, sensorStatus: 'online', lastUpdated: '2026-11-06T10:00:00', ...extra });
const decks = [
  deck('D1', 'Main Deck', 300, 45),
  deck('D2', 'Union Deck', 1200, 1180),
  deck('D3', 'East Deck 2', 650, 560),
  deck('D4', 'West Deck', 400, 392, { sensorStatus: 'stale' }),
  deck('D5', 'Ghost Deck', 500, null),
];
const row = name => screen.getByRole('rowheader', { name }).closest('tr');

async function signIn(pin = STAFF_PIN, props = {}) {
  const user = userEvent.setup();
  render(<StaffDashboard decks={decks} lastRefresh={new Date()} {...props} />);
  await user.type(screen.getByLabelText('Staff PIN'), pin);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  return user;
}

describe('access control', () => {
  test('dashboard is hidden until a staff member signs in', () => {
    render(<StaffDashboard decks={decks} lastRefresh={new Date()} />);
    expect(screen.getByRole('heading', { name: 'PATS staff sign-in' })).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  test('wrong PIN is rejected', async () => {
    await signIn('0000');
    expect(screen.getByRole('alert').textContent).toBe('Incorrect staff PIN.');
    expect(screen.queryByRole('table')).toBeNull();
  });

  test('correct PIN opens the dashboard, sign out hides it again', async () => {
    const user = await signIn();
    expect(screen.getByRole('table')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('dashboard', () => {
  test('lists every deck with occupied, capacity, available and occupancy %', async () => {
    await signIn();
    expect(screen.getAllByRole('rowheader').map(h => h.textContent)).toEqual(decks.map(d => d.name));
    const cells = within(row('Main Deck')).getAllByRole('cell').map(c => c.textContent);
    expect(cells.slice(0, 4)).toEqual(['45', '300', '255', '15%']);
  });

  test('flags decks approaching and at capacity', async () => {
    await signIn();
    expect(within(row('Main Deck')).getByText('Normal')).toBeTruthy();
    expect(within(row('East Deck 2')).getByText('Approaching capacity')).toBeTruthy();
    expect(within(row('Union Deck')).getByText('At capacity')).toBeTruthy();
  });

  test('shows sensor status and marks stale and missing data', async () => {
    await signIn();
    expect(within(row('Main Deck')).getByText('Online')).toBeTruthy();
    expect(within(row('West Deck')).getByText('Stale')).toBeTruthy();
    expect(within(row('West Deck')).getByText(/Outdated count/)).toBeTruthy();
    expect(within(row('Ghost Deck')).getByText('Offline')).toBeTruthy();
    expect(within(row('Ghost Deck')).getAllByText('No data')).toHaveLength(2);
    expect(row('West Deck').className).toBe('row-warning');
    expect(row('Main Deck').className).toBe('');
  });

  test('summary counts cars, near-full decks and sensors needing attention', async () => {
    await signIn();
    const overview = screen.getAllByText(/Cars parked now|Decks near or at capacity|Sensors needing attention/)
      .map(label => label.parentElement.textContent);
    expect(overview).toEqual(['Cars parked now2,177', 'Decks near or at capacity3', 'Sensors needing attention2']);
  });

  test('load error replaces the table with the message', async () => {
    await signIn(STAFF_PIN, { error: 'Parking data is temporarily unavailable. Please try again later.' });
    expect(screen.getByRole('status').textContent).toContain('temporarily unavailable');
    expect(screen.queryByRole('table')).toBeNull();
  });
});
