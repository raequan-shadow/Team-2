import React, { useEffect, useState } from 'react';
import { availableSpaces } from '../utils/parkingLogic.js';
import { spotsByLevel } from '../utils/spotLogic.js';
import { useSpotAvailability } from '../hooks/useSpotAvailability.js';

export default function ParkingFlow({ deck, onBack }) {
  const [step, setStep] = useState('choose');
  const [spotId, setSpotId] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [level, setLevel] = useState(null);
  const allSpots = useSpotAvailability();

  useEffect(() => { setStep('choose'); setSpotId(null); setStartedAt(null); setEndedAt(null); setLevel(null); }, [deck?.id]);
  if (!deck) return null;
  const open = availableSpaces(deck);
  const levels = allSpots ? spotsByLevel(allSpots, deck.id) : {};
  const levelNames = Object.keys(levels);
  const currentLevel = levels[level] ? level : levelNames[0];
  const sections = levels[currentLevel] ?? {};
  const levelSpots = Object.values(sections).flat();
  const selected = Object.values(levels).flatMap(l => Object.values(l).flat()).find(spot => spot.id === spotId);
  const ready = selected && !selected.occupied;
  const spotLevel = selected?.level ?? currentLevel;
  const timeText = date => date ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
  const duration = startedAt && endedAt ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)) : 0;
  const reset = () => { setStep('choose'); setSpotId(null); setStartedAt(null); setEndedAt(null); };

  return <section className="flow-overlay" aria-label="Parking simulation">
    <div className="flow-card">
      <div className="flow-nav"><button type="button" className="back-link" onClick={onBack}>← All parking decks</button></div>
      {/*<div className="flow-nav"><button type="button" className="back-link" onClick={onBack}>← All parking decks</button><span>SIMULATED DRIVER FLOW</span></div>*/}
      <p className="eyebrow">{deck.name}{step === 'choose' ? '' : ` · Level ${spotLevel}`}</p>
      {/*<p className="eyebrow">{deck.name} · Level 1 (illustrative)</p>*/}
      {step === 'choose' && <>
        <h2>Choose an available spot</h2>
        <p className="flow-muted">{open === null ? 'Occupancy data unavailable.' : `${open} spaces reported available across this deck.`}</p>
        <div className="flow-banner">{ready ? `✓ You selected ${spotId}` : 'Select a green spot below'}</div>
        {allSpots === undefined ? <p className="flow-muted" role="status">Loading individual spaces...</p>
          : levelNames.length === 0 ? <p className="unavailable-note" role="status">Individual-space data is unavailable for this deck. Use the deck-level count above and look for an open space when you arrive.</p>
          : <>
            <div className="level-tabs" role="group" aria-label="Choose a level">{levelNames.map(name => <button key={name} type="button" className="level-tab" aria-pressed={name === currentLevel} onClick={() => setLevel(name)}>Level {name}</button>)}</div>
            {levelSpots.every(spot => spot.occupied) && <p className="unavailable-note" role="status">No open spaces on Level {currentLevel}. Try another level.</p>}
            {Object.entries(sections).map(([section, spots]) => <div key={section}>
              <div className="spot-heading"><strong>Section {section}</strong><small>{spots.filter(spot => !spot.occupied).length} of {spots.length} free</small></div>
              <div className="spot-row">{spots.map(spot => <button key={spot.id} type="button" className={`spot ${spot.occupied ? 'spot-taken' : 'spot-free'} ${spotId === spot.id ? 'spot-selected' : ''}`} disabled={spot.occupied || open === null} aria-pressed={spotId === spot.id} onClick={() => setSpotId(spot.id)}>{spot.id}<span>{spot.occupied ? 'TAKEN' : 'FREE'}</span></button>)}</div>
            </div>)}
            <p className="legend">🟢 free &nbsp; 🔴 taken &nbsp; · &nbsp; updates every 30 seconds</p>
          </>}
        <div className="flow-instructions"><strong>When you get there</strong><p>Drive to the selected deck and confirm the space is actually open. This demonstration does not reserve or verify a real parking spot.</p></div>
        <button className="primary-action" disabled={!ready || open === null} onClick={() => setStep('confirm')}>Continue with {spotId || 'a spot'} →</button>
      </>}
      {step === 'confirm' && <>
        <h2>Spot {spotId} is shown as free</h2><div className="spot-hero"><small>DEMO PARKING SPOT</small><strong>{spotId}</strong><span>{deck.name} · Level {spotLevel}</span></div>
        <div className="flow-instructions"><strong>Parking instructions</strong><p>Go to {deck.name}, look for a safe, legal space, and tap below to simulate the start of a parking session. The app does not connect to an entrance gate or vehicle.</p></div>
        <button className="primary-action" onClick={() => { setStartedAt(new Date()); setStep('parked'); }}>Tap in · park here</button>
        {/*<button className="primary-action" onClick={() => { setStartedAt(new Date()); setStep('parked'); }}>Tap in · park here (demo)</button>*/}
        <button className="secondary-action" onClick={() => setStep('choose')}>Not here? Choose another spot</button>
      </>}
      {step === 'parked' && <>
        <h2>✓ You're parked (demo)</h2><div className="spot-hero spot-hero-blue"><small>YOUR DEMO SPOT</small><strong>{spotId}</strong><span>{deck.name} · Level {spotLevel}</span></div>
        <div className="flow-instructions"><p><strong>Started:</strong> {timeText(startedAt)}</p><p><strong>Status:</strong> Simulated parking session in this browser tab.</p><p>When you're ready, tap out to generate a demo summary.</p></div>
        <button className="danger-action" onClick={() => { setEndedAt(new Date()); setStep('summary'); }}>Tap out · I'm leaving</button>
      </>}
      {step === 'summary' && <>
        <div className="thanks">✓</div><h2>Thanks for trying SmartPark!</h2><p className="flow-muted">Your demonstration parking session has ended.</p>
        <div className="flow-instructions"><p><strong>Deck:</strong> {deck.name}</p><p><strong>Spot:</strong> {spotId} · Level {spotLevel}</p><p><strong>Tap in:</strong> {timeText(startedAt)}</p><p><strong>Tap out:</strong> {timeText(endedAt)}</p><p><strong>Duration:</strong> {duration} minutes</p></div>
        <button className="primary-action" onClick={reset}>See spots again</button>
        {/*<button className="primary-action" onClick={reset}>See demo spots again</button>*/}
        <button className="secondary-action" onClick={onBack}>Back to all decks</button>
      </>}
      
      {/*<p className="demo-note">Prototype only · no real reservation, NFC, vehicle tracking, or campus parking integration.</p>*/}
    </div>
  </section>;
}
