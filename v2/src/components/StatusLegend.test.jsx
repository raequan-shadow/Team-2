import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import StatusLegend from './StatusLegend.jsx';
import DeckCard from './DeckCard.jsx';

const deck = { id: 'D1', name: 'Main Deck', location: 'Main campus', totalCapacity: 300, occupiedSpaces: 45, isDataAvailable: true };

test('legend explains all three color thresholds', () => {
  render(<StatusLegend />);
  const items = screen.getAllByRole('listitem').map(li => li.textContent);
  expect(items).toEqual(['Available 20% or more open', 'Limited spaces 5–19% open', 'Almost full under 5% open']);
});

test('deck card shows when its data was last updated', () => {
  const lastUpdated = new Date(2026, 10, 6, 13, 24).toISOString();
  render(<DeckCard deck={{ ...deck, lastUpdated }} onToggle={() => {}} onChoose={() => {}} />);
  const expected = new Date(lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  expect(screen.getByText(`Updated ${expected}`)).toBeTruthy();
});

test('missing or invalid timestamps are hidden instead of showing "Invalid Date"', () => {
  const { rerender, container } = render(<DeckCard deck={deck} onToggle={() => {}} onChoose={() => {}} />);
  expect(container.querySelector('.deck-updated')).toBeNull();
  rerender(<DeckCard deck={{ ...deck, lastUpdated: 'not a date' }} onToggle={() => {}} onChoose={() => {}} />);
  expect(container.querySelector('.deck-updated')).toBeNull();
});
