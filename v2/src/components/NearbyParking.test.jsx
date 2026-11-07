import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import NearbyParking from './NearbyParking.jsx';
import { parseParkingCsv } from '../utils/parkingLogic.js';
import csv from '../../public/data/parking.csv?raw';

const decks = parseParkingCsv(csv);
const items = () => screen.getAllByRole('listitem').map(li => li.querySelector('h3').textContent);
const item = name => screen.getByRole('heading', { name }).closest('li');

async function pick(buildingName, props = {}) {
  const user = userEvent.setup();
  render(<NearbyParking decks={decks} onChoose={() => {}} {...props} />);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Destination building' }), buildingName);
  return user;
}

test('asks for a building before showing results', () => {
  render(<NearbyParking decks={decks} onChoose={() => {}} />);
  expect(screen.getByText('Choose a destination building to see nearby parking.')).toBeTruthy();
  expect(screen.queryByRole('listitem')).toBeNull();
});

test('lists nearby decks closest first with spaces and walking distance', async () => {
  await pick('Atkins Library');
  expect(items()).toEqual(['Main Deck', 'East Deck 2', 'Union Deck', 'South Village Deck']);
  expect(within(item('Main Deck')).getByText('189 m · about 2 min walk')).toBeTruthy();
  expect(within(item('Main Deck')).getByText('255 of 300 spaces available')).toBeTruthy();
  expect(within(item('Union Deck')).getByText('Almost full')).toBeTruthy();
});

test('changing the building updates the results', async () => {
  const user = await pick('Atkins Library');
  await user.selectOptions(screen.getByRole('combobox'), 'Duke Centennial Hall');
  expect(items()).toEqual(['North Deck', 'West Deck', 'Union Deck']);
});

test('directions link opens Google Maps safely in a new tab', async () => {
  await pick('Atkins Library');
  const link = within(item('Main Deck')).getByRole('link', { name: 'Directions' });
  expect(link.getAttribute('href')).toContain('destination=35.3065,-80.734');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
});

test('"View deck" passes the deck id, and is disabled for decks without space', async () => {
  const onChoose = vi.fn();
  const user = await pick('Atkins Library', { onChoose, decks: decks.map(d => d.id === 'D03' ? { ...d, occupiedSpaces: d.totalCapacity } : d) });
  await user.click(within(item('Main Deck')).getByRole('button', { name: /View deck/ }));
  expect(onChoose).toHaveBeenCalledWith('D01');
  expect(within(item('East Deck 2')).getByRole('button', { name: /View deck/ }).disabled).toBe(true);
});

test('far building shows the no-nearby-parking message', async () => {
  await pick('Harris Alumni Center');
  expect(screen.getByText(/No nearby parking is available for Harris Alumni Center/)).toBeTruthy();
  expect(screen.queryByRole('listitem')).toBeNull();
});

test('nearby decks that are all full also show the message', async () => {
  await pick('Duke Centennial Hall', { decks: decks.map(d => ({ ...d, occupiedSpaces: d.totalCapacity })) });
  expect(screen.getByText(/No nearby parking is available/)).toBeTruthy();
  expect(items()).toEqual(['North Deck', 'West Deck', 'Union Deck']);
});

test('map view shows the building and clickable nearby decks', async () => {
  const onChoose = vi.fn();
  const user = await pick('Atkins Library', { onChoose });
  await user.click(screen.getByRole('button', { name: 'Map' }));
  const map = screen.getByRole('img', { name: 'Map of parking decks near Atkins Library' });
  expect(within(map).getByText('Atkins Library')).toBeTruthy();
  expect(screen.queryByRole('listitem')).toBeNull();

  await user.click(within(map).getByRole('button', { name: 'Main Deck, 255 spaces available' }));
  within(map).getByRole('button', { name: /Union Deck/ }).focus();
  await user.keyboard('{Enter}');
  expect(onChoose.mock.calls).toEqual([['D01'], ['D02']]);

  await user.click(screen.getByRole('button', { name: 'List' }));
  expect(items()).toHaveLength(4);
});
