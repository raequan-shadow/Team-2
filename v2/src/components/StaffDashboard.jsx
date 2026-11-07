import React, { useState } from 'react';
import { availableSpaces, occupancyLevel, sensorHealth } from '../utils/parkingLogic.js';

// ponytail: client-side PIN gate for the demo only; a real PATS dashboard needs server-side auth (campus SSO).
export const STAFF_PIN = '3155';

const timeText = iso => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};
const levelClass = { Normal: 'green', 'Approaching capacity': 'yellow', 'At capacity': 'red', 'No data': 'unavailable' };

function StaffSignIn({ onSignIn }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const submit = event => {
    event.preventDefault();
    if (pin === STAFF_PIN) onSignIn();
    else setError('Incorrect staff PIN.');
  };
  return <form className="staff-signin" onSubmit={submit}>
    <h2>PATS staff sign-in</h2>
    <p className="flow-muted">The occupancy dashboard is limited to Parking and Transportation Services staff.</p>
    <label className="search-label" htmlFor="staff-pin">Staff PIN</label>
    <div className="search-field"><input id="staff-pin" type="password" autoComplete="off" value={pin} onChange={e => { setPin(e.target.value); setError(''); }} /></div>
    {error && <p className="unavailable-note" role="alert">{error}</p>}
    <button type="submit" className="primary-action">Sign in</button>
  </form>;
}

export default function StaffDashboard({ decks, lastRefresh, error }) {
  const [signedIn, setSignedIn] = useState(false);
  if (!signedIn) return <section className="listing"><StaffSignIn onSignIn={() => setSignedIn(true)} /></section>;
  if (error) return <section className="listing"><div className="empty-state" role="status">{error}</div></section>;

  const reporting = decks.filter(d => availableSpaces(d) !== null);
  const occupied = reporting.reduce((sum, d) => sum + d.occupiedSpaces, 0);
  const nearFull = decks.filter(d => ['Approaching capacity', 'At capacity'].includes(occupancyLevel(d))).length;
  const attention = decks.filter(d => sensorHealth(d) !== 'Online').length;

  return <section className="listing" aria-label="PATS occupancy dashboard">
    <div className="listing-heading">
      <div><h2>Deck occupancy dashboard</h2><p>Refreshes automatically every 30 seconds.</p></div>
      <span className="updated">{lastRefresh ? `Refreshed ${lastRefresh.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}` : 'Loading...'}</span>
    </div>
    <div className="overview staff-overview">
      <div><span className="overview-label">Cars parked now</span><strong>{occupied.toLocaleString()}</strong></div>
      <div><span className="overview-label">Decks near or at capacity</span><strong>{nearFull}</strong></div>
      <div><span className="overview-label">Sensors needing attention</span><strong>{attention}</strong></div>
    </div>
    <div className="table-wrap">
      <table className="staff-table">
        <thead><tr><th>Deck</th><th>Occupied</th><th>Capacity</th><th>Available</th><th>Occupancy</th><th>Status</th><th>Sensor</th><th>Last reading</th></tr></thead>
        <tbody>{decks.map(deck => {
          const open = availableSpaces(deck);
          const level = occupancyLevel(deck);
          const sensor = sensorHealth(deck);
          return <tr key={deck.id} className={sensor === 'Online' ? '' : 'row-warning'}>
            <th scope="row">{deck.name}</th>
            <td>{open === null ? 'No data' : deck.occupiedSpaces.toLocaleString()}</td>
            <td>{deck.totalCapacity.toLocaleString()}</td>
            <td>{open === null ? '—' : open.toLocaleString()}</td>
            <td>{open === null || deck.totalCapacity <= 0 ? '—' : `${Math.round(100 * deck.occupiedSpaces / deck.totalCapacity)}%`}</td>
            <td><span className={`badge badge-${levelClass[level]}`}>{level}</span></td>
            <td><span className={`sensor sensor-${sensor.toLowerCase()}`}>{sensor}</span>{sensor === 'Stale' && <small className="outdated"> Outdated count</small>}</td>
            <td>{timeText(deck.lastUpdated)}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <button type="button" className="secondary-action staff-signout" onClick={() => setSignedIn(false)}>Sign out</button>
  </section>;
}
