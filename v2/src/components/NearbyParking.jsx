import React, { useState } from 'react';
import AvailabilityBadge from './AvailabilityBadge.jsx';
import { BUILDINGS, DECK_COORDS } from '../data/campus.js';
import { availabilityStatus, availableSpaces } from '../utils/parkingLogic.js';
import { NEARBY_METERS, directionsUrl, nearbyDecks, walkMinutes } from '../utils/nearbyLogic.js';

const dotColor = { Green: '#1d9f64', Yellow: '#e0a316', Red: '#d94338', Unavailable: '#8a96a3' };

function CampusMap({ building, results, onChoose }) {
  // Fit the building and its nearby decks into a 400x260 box.
  const points = [building, ...results.map(r => DECK_COORDS[r.deck.id])];
  const pad = 0.0015;
  const minLat = Math.min(...points.map(p => p.lat)) - pad, maxLat = Math.max(...points.map(p => p.lat)) + pad;
  const minLng = Math.min(...points.map(p => p.lng)) - pad, maxLng = Math.max(...points.map(p => p.lng)) + pad;
  const x = lng => (400 * (lng - minLng)) / (maxLng - minLng);
  const y = lat => 260 - (260 * (lat - minLat)) / (maxLat - minLat);

  return <svg className="campus-map" viewBox="0 0 400 260" role="img" aria-label={`Map of parking decks near ${building.name}`}>
    {results.map(({ deck }) => {
      const c = DECK_COORDS[deck.id];
      return <line key={deck.id} x1={x(building.lng)} y1={y(building.lat)} x2={x(c.lng)} y2={y(c.lat)} className="map-path" />;
    })}
    <rect x={x(building.lng) - 7} y={y(building.lat) - 7} width="14" height="14" rx="3" className="map-building" />
    <text x={x(building.lng)} y={y(building.lat) - 12} textAnchor="middle" className="map-label">{building.name}</text>
    {results.map(({ deck }) => {
      const c = DECK_COORDS[deck.id];
      const open = availableSpaces(deck);
      return <g key={deck.id} role="button" tabIndex={0} aria-label={`${deck.name}, ${open ?? 'no'} spaces available`} className="map-deck"
        onClick={() => onChoose(deck.id)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onChoose(deck.id)}>
        <circle cx={x(c.lng)} cy={y(c.lat)} r="11" fill={dotColor[availabilityStatus(deck)]} />
        <text x={x(c.lng)} y={y(c.lat) + 24} textAnchor="middle" className="map-label">{deck.name}</text>
      </g>;
    })}
  </svg>;
}

export default function NearbyParking({ decks, onChoose }) {
  const [buildingId, setBuildingId] = useState('');
  const [mode, setMode] = useState('list');
  const building = BUILDINGS.find(b => b.id === buildingId);
  const results = building ? nearbyDecks(decks, building) : [];
  const withSpace = results.filter(r => availableSpaces(r.deck) > 0);

  return <section className="listing" aria-label="Nearby parking">
    <div className="listing-heading"><div><h2>Find parking near your building</h2><p>Decks within a {NEARBY_METERS} m walk, closest first.</p></div></div>
    <label className="search-wrap">
      <span className="search-label">Where are you headed?</span>
      <div className="search-field"><select className="building-select" value={buildingId} onChange={e => setBuildingId(e.target.value)} aria-label="Destination building">
        <option value="">Choose a building…</option>
        {BUILDINGS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select></div>
    </label>

    {!building ? <div className="empty-state" role="status">Choose a destination building to see nearby parking.</div> : <>
      <div className="level-tabs" role="group" aria-label="View as">
        {[['list', 'List'], ['map', 'Map']].map(([id, label]) => <button key={id} type="button" className="level-tab" aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}
      </div>
      {withSpace.length === 0 && <div className="empty-state" role="status">No nearby parking is available for {building.name} right now. Try another building or check the full deck list.</div>}
      {results.length > 0 && (mode === 'map'
        ? <CampusMap building={building} results={results} onChoose={onChoose} />
        : <ul className="nearby-list">{results.map(({ deck, meters }) => {
          const open = availableSpaces(deck);
          return <li key={deck.id} className="nearby-item">
            <div className="deck-top"><div><h3>{deck.name}</h3><p className="location">{meters} m · about {walkMinutes(meters)} min walk</p></div><AvailabilityBadge deck={deck} /></div>
            <p className="nearby-spaces">{open === null ? 'Occupancy data unavailable' : `${open.toLocaleString()} of ${deck.totalCapacity.toLocaleString()} spaces available`}</p>
            <div className="nearby-actions">
              <button type="button" className="choose-button" disabled={!open} onClick={() => onChoose(deck.id)}>View deck →</button>
              <a className="directions-link" href={directionsUrl(deck.id)} target="_blank" rel="noopener noreferrer">Directions</a>
            </div>
          </li>;
        })}</ul>)}
    </>}
  </section>;
}
