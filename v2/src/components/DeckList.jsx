import React from 'react';
import DeckCard from './DeckCard.jsx';
export default function DeckList({ decks, expandedId, onExpand, onChoose }) {
  return <section aria-label="Parking deck availability" className="deck-list">{decks.map(deck => <DeckCard key={deck.id} deck={deck} expanded={expandedId === deck.id} onToggle={() => onExpand(expandedId === deck.id ? null : deck.id)} onChoose={() => onChoose(deck.id)} />)}</section>;
}
