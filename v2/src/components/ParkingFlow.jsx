import React, { useEffect, useMemo, useState } from 'react';
import { availableSpaces } from '../utils/parkingLogic.js';

// The screenshot's A1–A6 row is a DEMO representation, not a real inventory.
// Avoid pretending the CSV contains per-spot sensor readings.
function demoSpots(deck) {
  if (!deck) return [];
  const occupied = deck.occupiedSpaces ?? 0;
  return Array.from({ length: 6 }, (_, i) => ({
    id: `A${i + 1}`,
    // At least one free sample if the deck reports spaces, otherwise no spots.
    free: availableSpaces(deck) > 0 && (i === 5 || (occupied + i * 7) % 4 === 0),
  }));
}

export default function ParkingFlow({ deck, onBack }) {
  const [step, setStep] = useState('choose');
  const [spotId, setSpotId] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const spots = useMemo(() => demoSpots(deck), [deck?.id]);

  useEffect(() => { setStep('choose'); setSpotId(null); setStartedAt(null); setEndedAt(null); }, [deck?.id]);
  if (!deck) return null;
  const open = availableSpaces(deck);
  const ready = spotId && spots.some(spot => spot.id === spotId && spot.free);
  const timeText = date => date ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
  const duration = startedAt && endedAt ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)) : 0;
  const reset = () => { setStep('choose'); setSpotId(null); setStartedAt(null); setEndedAt(null); };

  return <section className="flow-overlay" aria-label="Parking simulation">
    <div className="flow-card">
      <div className="flow-nav"><button type="button" className="back-link" onClick={onBack}>← All parking decks</button><span>SIMULATED DRIVER FLOW</span></div>
      <p className="eyebrow">{deck.name} · Level 1 (illustrative)</p>
      {step === 'choose' && <>
        <h2>Choose an available spot</h2>
        <p className="flow-muted">{open === null ? 'Occupancy data unavailable.' : `${open} spaces reported available across this deck.`} The A1–A6 examples below are generated for the prototype and do not represent real spaces.</p>
        <div className="flow-banner">{ready ? `✓ You selected ${spotId}` : 'Select a green spot below'}</div>
        <div className="spot-heading"><strong>Level 1</strong><small>Entrance →</small></div>
        <div className="spot-row">{spots.map(spot => <button key={spot.id} type="button" className={`spot ${spot.free ? 'spot-free' : 'spot-taken'} ${spotId === spot.id ? 'spot-selected' : ''}`} disabled={!spot.free || open === null} aria-pressed={spotId === spot.id} onClick={() => setSpotId(spot.id)}>{spot.id}<span>{spot.free ? 'FREE' : 'TAKEN'}</span></button>)}</div>
        <p className="legend">🟢 Demo free &nbsp; 🔴 Demo taken &nbsp; · &nbsp; Not real-time spot sensing</p>
        <div className="flow-instructions"><strong>When you get there</strong><p>Drive to the selected deck and confirm the space is actually open. This demonstration does not reserve or verify a real parking spot.</p></div>
        <button className="primary-action" disabled={!ready || open === null} onClick={() => setStep('confirm')}>Continue with {spotId || 'a spot'} →</button>
      </>}
      {step === 'confirm' && <>
        <h2>Spot {spotId} is shown as free</h2><div className="spot-hero"><small>DEMO PARKING SPOT</small><strong>{spotId}</strong><span>{deck.name} · Level 1</span></div>
        <div className="flow-instructions"><strong>Parking instructions</strong><p>Go to {deck.name}, look for a safe, legal space, and tap below to simulate the start of a parking session. The app does not connect to an entrance gate or vehicle.</p></div>
        <button className="primary-action" onClick={() => { setStartedAt(new Date()); setStep('parked'); }}>Tap in · park here (demo)</button>
        <button className="secondary-action" onClick={() => setStep('choose')}>Not here? Choose another spot</button>
      </>}
      {step === 'parked' && <>
        <h2>✓ You're parked (demo)</h2><div className="spot-hero spot-hero-blue"><small>YOUR DEMO SPOT</small><strong>{spotId}</strong><span>{deck.name} · Level 1</span></div>
        <div className="flow-instructions"><p><strong>Started:</strong> {timeText(startedAt)}</p><p><strong>Status:</strong> Simulated parking session in this browser tab.</p><p>When you're ready, tap out to generate a demo summary.</p></div>
        <button className="danger-action" onClick={() => { setEndedAt(new Date()); setStep('summary'); }}>Tap out · I'm leaving</button>
      </>}
      {step === 'summary' && <>
        <div className="thanks">✓</div><h2>Thanks for trying SmartPark!</h2><p className="flow-muted">Your demonstration parking session has ended.</p>
        <div className="flow-instructions"><p><strong>Deck:</strong> {deck.name}</p><p><strong>Spot:</strong> {spotId} · Level 1</p><p><strong>Tap in:</strong> {timeText(startedAt)}</p><p><strong>Tap out:</strong> {timeText(endedAt)}</p><p><strong>Duration:</strong> {duration} minutes</p></div>
        <button className="primary-action" onClick={reset}>See demo spots again</button>
        <button className="secondary-action" onClick={onBack}>Back to all decks</button>
      </>}
      <p className="demo-note">Prototype only · no real reservation, NFC, vehicle tracking, or campus parking integration.</p>
    </div>
  </section>;
}
