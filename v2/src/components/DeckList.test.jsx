import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import DeckList from './DeckList.jsx';

const decks = [
  { id: 'D1', name: 'Main Deck', location: 'Main campus', totalCapacity: 300, occupiedSpaces: 45, isDataAvailable: true },
  { id: 'D2', name: 'Union Deck', location: 'Near Student Union', totalCapacity: 1200, occupiedSpaces: 1180, isDataAvailable: true },
];
const card = name => screen.getByRole('heading', { name }).closest('article');

test('renders one card per deck in order', () => {
  render(<DeckList decks={decks} expandedId={null} onExpand={() => {}} onChoose={() => {}} />);
  expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Main Deck', 'Union Deck']);
});

test('renders an empty list without crashing', () => {
  render(<DeckList decks={[]} expandedId={null} onExpand={() => {}} onChoose={() => {}} />);
  expect(screen.getByRole('region', { name: 'Parking deck availability' }).children).toHaveLength(0);
});

test('only the expanded deck shows details', () => {
  render(<DeckList decks={decks} expandedId="D2" onExpand={() => {}} onChoose={() => {}} />);
  expect(within(card('Union Deck')).getByText(/Occupied spaces:/)).toBeTruthy();
  expect(within(card('Main Deck')).queryByText(/Occupied spaces:/)).toBeNull();
});

test('toggle opens a closed deck and closes an open one', async () => {
  const onExpand = vi.fn();
  render(<DeckList decks={decks} expandedId="D2" onExpand={onExpand} onChoose={() => {}} />);
  await userEvent.click(within(card('Main Deck')).getByRole('button', { name: /View details/ }));
  await userEvent.click(within(card('Union Deck')).getByRole('button', { name: /Hide details/ }));
  expect(onExpand.mock.calls).toEqual([['D1'], [null]]);
});

test('choose passes the deck id', async () => {
  const onChoose = vi.fn();
  render(<DeckList decks={decks} expandedId={null} onExpand={() => {}} onChoose={onChoose} />);
  await userEvent.click(within(card('Union Deck')).getByRole('button', { name: /Choose deck/ }));
  expect(onChoose).toHaveBeenCalledWith('D2');
});
