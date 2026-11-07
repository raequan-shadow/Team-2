import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AvailabilityBadge from './AvailabilityBadge.jsx';
import DeckCard from './DeckCard.jsx';
import SearchBar from './SearchBar.jsx';
import EmptyState from './EmptyState.jsx';
import Header from './Header.jsx';

const deck = { id: 'D1', name: 'Main Deck', location: 'Main campus', totalCapacity: 300, occupiedSpaces: 45, isDataAvailable: true };
const noData = { ...deck, occupiedSpaces: null, isDataAvailable: false };

describe('AvailabilityBadge', () => {
  test.each([
    [45, 'Available', 'badge-green'],
    [270, 'Limited spaces', 'badge-yellow'],
    [290, 'Almost full', 'badge-red'],
  ])('%i occupied -> %s', (occupied, label, cls) => {
    render(<AvailabilityBadge deck={{ ...deck, occupiedSpaces: occupied }} />);
    expect(screen.getByText(label)).toHaveProperty('className', `badge ${cls}`);
  });

  test('missing data -> Unavailable', () => {
    render(<AvailabilityBadge deck={noData} />);
    expect(screen.getByText('Unavailable').className).toContain('badge-unavailable');
  });
});

describe('DeckCard', () => {
  test('shows available spaces, capacity and occupancy bar', () => {
    render(<DeckCard deck={deck} onToggle={() => {}} onChoose={() => {}} />);
    expect(screen.getByText('255')).toBeTruthy();
    expect(screen.getByText('300')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('15');
  });

  test('missing data shows a message instead of a number and disables choosing', () => {
    render(<DeckCard deck={noData} onToggle={() => {}} onChoose={() => {}} />);
    expect(screen.getByText('Occupancy data is currently unavailable.')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Data unavailable' }).disabled).toBe(true);
  });

  test('full deck cannot be chosen', () => {
    render(<DeckCard deck={{ ...deck, occupiedSpaces: 300 }} onToggle={() => {}} onChoose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Deck full' }).disabled).toBe(true);
  });

  test('details panel follows the expanded prop', () => {
    const { rerender } = render(<DeckCard deck={deck} expanded={false} onToggle={() => {}} onChoose={() => {}} />);
    expect(screen.queryByText(/Occupied spaces:/)).toBeNull();
    rerender(<DeckCard deck={deck} expanded onToggle={() => {}} onChoose={() => {}} />);
    expect(screen.getByText(/Occupied spaces:/).parentElement.textContent).toContain('45');
    expect(screen.getByRole('button', { name: /Hide details/ }).getAttribute('aria-expanded')).toBe('true');
  });

  test('buttons call their handlers', async () => {
    const onToggle = vi.fn(), onChoose = vi.fn();
    render(<DeckCard deck={deck} onToggle={onToggle} onChoose={onChoose} />);
    await userEvent.click(screen.getByRole('button', { name: /View details/ }));
    await userEvent.click(screen.getByRole('button', { name: /Choose deck/ }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onChoose).toHaveBeenCalledOnce();
  });
});

describe('SearchBar', () => {
  test('reports typed text', async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('searchbox'), 'U');
    expect(onChange).toHaveBeenCalledWith('U');
  });

  test('renders without props', () => {
    render(<SearchBar />);
    expect(screen.getByRole('searchbox').value).toBe('');
  });
});

test('EmptyState and Header render', () => {
  render(<><Header /><EmptyState message="Nothing here" /></>);
  expect(screen.getByText('SmartPark')).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('Nothing here');
});
