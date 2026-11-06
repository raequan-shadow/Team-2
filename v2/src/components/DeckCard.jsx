import React from 'react';
import AvailabilityBadge from './AvailabilityBadge.jsx';
import { availableSpaces } from '../utils/parkingLogic.js';
const updatedText = iso => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : `Updated ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
};

export default function DeckCard({ deck, expanded, onToggle, onChoose }) {
  const open = availableSpaces(deck);
  const updated = deck.lastUpdated && updatedText(deck.lastUpdated);
  return <article className="deck-card">
    <div className="deck-top"><div><h3>{deck.name}</h3><p className="location">{deck.location}</p></div><AvailabilityBadge deck={deck}/></div>
    <div className="deck-stats"><div><span className="metric-label">Available spaces</span><strong className="metric-main">{open === null ? '—' : open.toLocaleString()}</strong></div><div><span className="metric-label">Total capacity</span><strong className="metric-total">{deck.totalCapacity.toLocaleString()}</strong></div></div>
    {open === null ? <p className="unavailable-note" role="status">Occupancy data is currently unavailable.</p> : <div className="capacity-track" role="progressbar" aria-label={`${deck.name} occupied percentage`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(100 * deck.occupiedSpaces / deck.totalCapacity)}><div className="capacity-fill" style={{width:`${100*deck.occupiedSpaces/deck.totalCapacity}%`}} /></div>}
    {updated && <p className="deck-updated">{updated}</p>}
    <button className="details-button" type="button" aria-expanded={expanded} onClick={onToggle}>{expanded ? 'Hide details' : 'View details'} <span aria-hidden="true">{expanded ? '↑' : '→'}</span></button>
    {expanded && <div className="details-panel"><p><strong>Occupied spaces:</strong> {deck.occupiedSpaces === null ? 'Unavailable' : deck.occupiedSpaces.toLocaleString()}</p><p><strong>Data source:</strong> simulated occupancy, not live campus sensors.</p></div>}
    <button className="choose-button" type="button" disabled={open === null || open === 0} onClick={onChoose}>{open === null ? "Data unavailable" : open === 0 ? "Deck full" : "Choose deck →"}</button>
  </article>;
}
