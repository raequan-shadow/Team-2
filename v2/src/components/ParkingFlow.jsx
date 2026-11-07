
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

  // Reset the parking flow when the user selects another deck.
  useEffect(() => {
    setStep('choose');
    setSpotId(null);
    setStartedAt(null);
    setEndedAt(null);
    setLevel(null);
  }, [deck?.id]);

  // Organize parking spots by floor.
  const levels = deck && Array.isArray(allSpots)
    ? spotsByLevel(allSpots, deck.id)
    : {};

  const levelNames = Object.keys(levels);
  const currentLevel = levels[level] ? level : levelNames[0];
  const sections = levels[currentLevel] ?? {};
  const levelSpots = Object.values(sections).flat();

  // Find the currently selected parking spot.
  const selected = Object.values(levels)
    .flatMap(l => Object.values(l).flat())
    .find(spot => spot.id === spotId);

  const ready = Boolean(selected && !selected.occupied);
  const spotLevel = selected?.level ?? currentLevel;

  // Find available alternatives in the same parking deck.
  // Prefer spots on the same floor as the original selection.
  const alternatives = Array.isArray(allSpots)
    ? allSpots
        .filter(spot =>
          spot.deckId === deck?.id &&
          spot.id !== spotId &&
          !spot.occupied
        )
        .sort((a, b) =>
          Number(b.level === spotLevel) -
          Number(a.level === spotLevel)
        )
    : [];

  // Automatically detect when the selected spot becomes occupied.
  useEffect(() => {
    if (
      selected?.occupied &&
      (step === 'choose' || step === 'confirm')
    ) {
      setStep('unavailable');
    }
  }, [selected?.occupied, step]);

  if (!deck) return null;

  const open = availableSpaces(deck);

  const timeText = date =>
    date
      ? date.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit'
        })
      : '—';

  const duration =
    startedAt && endedAt
      ? Math.max(
          0,
          Math.round(
            (endedAt.getTime() - startedAt.getTime()) / 60000
          )
        )
      : 0;

  const reset = () => {
    setStep('choose');
    setSpotId(null);
    setStartedAt(null);
    setEndedAt(null);
    setLevel(null);
  };

  return (
    <section className="flow-overlay" aria-label="Parking simulation">
      <div className="flow-card">

        <div className="flow-nav">
          <button
            type="button"
            className="back-link"
            onClick={onBack}
          >
            ← All parking decks
          </button>
        </div>

        <p className="eyebrow">
          {deck.name}
          {step !== 'choose' ? ` · Level ${spotLevel}` : ''}
        </p>

        {/* STEP 1: Choose a parking spot */}
        {step === 'choose' && (
          <>
            <h2>Choose an available spot</h2>

            <p className="flow-muted">
              {open === null
                ? 'Occupancy data unavailable.'
                : `${open} spaces reported available across this deck.`
              }
            </p>

            {levelNames.length > 0 && (
              <div className="flow-banner">
                {ready
                  ? `✓ You selected ${spotId}`
                  : 'Select a green spot below'
                }
              </div>
            )}

            {allSpots === undefined ? (
              <p className="flow-muted" role="status">
                Loading individual spaces...
              </p>
            ) : levelNames.length === 0 ? (
              <p className="unavailable-note" role="status">
                Individual-space data is unavailable for this deck.
              </p>
            ) : (
              <>
                <div className="level-tabs" role="group">
                  {levelNames.map(name => (
                    <button
                      key={name}
                      type="button"
                      className="level-tab"
                      aria-pressed={name === currentLevel}
                      onClick={() => setLevel(name)}
                    >
                      Level {name}
                    </button>
                  ))}
                </div>

                {levelSpots.every(spot => spot.occupied) && (
                  <p className="unavailable-note">
                    No open spaces on Level {currentLevel}.
                    Try another level.
                  </p>
                )}

                {Object.entries(sections).map(([section, spots]) => (
                  <div key={section}>
                    <div className="spot-heading">
                      <strong>Section {section}</strong>
                      <small>
                        {spots.filter(spot => !spot.occupied).length}
                        {' of '}{spots.length} free
                      </small>
                    </div>

                    <div className="spot-row">
                      {spots.map(spot => (
                        <button
                          key={spot.id}
                          type="button"
                          className={`spot ${
                            spot.occupied
                              ? 'spot-taken'
                              : 'spot-free'
                          } ${
                            spotId === spot.id
                              ? 'spot-selected'
                              : ''
                          }`}
                          disabled={spot.occupied || open === null}
                          aria-pressed={spotId === spot.id}
                          onClick={() => setSpotId(spot.id)}
                        >
                          {spot.id}
                          <span>
                            {spot.occupied ? 'TAKEN' : 'FREE'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <p className="legend">
                  🟢 free &nbsp; 🔴 taken &nbsp; ·
                  &nbsp; updates every 30 seconds
                </p>
              </>
            )}

            <div className="flow-instructions">
              <strong>When you get there</strong>
              <p>
                Drive to the selected deck and confirm the space
                is actually open. This demonstration does not
                reserve or verify a real parking spot.
              </p>
            </div>

            <button
              className="primary-action"
              disabled={!ready || open === null}
              onClick={() => setStep('confirm')}
            >
              Continue with {spotId || 'a spot'} →
            </button>
          </>
        )}

        {/* STEP 2: Original selected spot becomes occupied */}
        {step === 'unavailable' && (
          <>
            <h2>Oops! Spot {spotId} is unavailable.</h2>

            <p className="flow-muted">
              This parking spot was previously available, but
              the latest occupancy update shows that it is
              now occupied.
            </p>

            <div className="flow-instructions">
              <strong>Let's find you another spot.</strong>
              <p>
                Here are other parking spots currently marked
                as available in {deck.name}.
              </p>
            </div>

            {allSpots === undefined ? (
              <p role="status" className="flow-muted">
                Loading parking information...
              </p>
            ) : allSpots === null ? (
              <p className="unavailable-note">
                Parking occupancy information is unavailable.
                Please try again.
              </p>
            ) : alternatives.length > 0 ? (
              <>
                <p className="spot-heading">
                  Available alternative spots
                </p>

                <div className="spot-row">
                  {alternatives.map(spot => (
                    <button
                      key={spot.id}
                      type="button"
                      className="spot spot-free"
                      onClick={() => {
                        setSpotId(spot.id);
                        setStep('confirm');
                      }}
                    >
                      {spot.id}
                      <span>
                        SELECT · LEVEL {spot.level}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="legend">
                  Same-floor alternatives are shown first.
                  All recommendations use simulated data.
                </p>
              </>
            ) : (
              <p className="unavailable-note">
                Unfortunately, there are no other available
                spots in this deck. Please choose another
                parking deck.
              </p>
            )}

            <button
              className="secondary-action"
              onClick={() => {
                setStep('choose');
                setSpotId(null);
              }}
            >
              Choose another spot manually
            </button>
          </>
        )}

        {/* STEP 3: Confirm selected spot */}
        {step === 'confirm' && (
          <>
            <h2>Spot {spotId} is shown as free</h2>

            <div className="spot-hero">
              <small>DEMO PARKING SPOT</small>
              <strong>{spotId}</strong>
              <span>{deck.name} · Level {spotLevel}</span>
            </div>

            <div className="flow-instructions">
              <strong>Parking instructions</strong>
              <p>
                Go to {deck.name}, look for a safe, legal space,
                and tap below to simulate the start of a
                parking session.
              </p>
            </div>

            <button
              className="primary-action"
              disabled={!ready}
              onClick={() => {
                if (!ready) {
                  setStep('unavailable');
                  return;
                }

                setStartedAt(new Date());
                setStep('parked');
              }}
            >
              Tap in · park here
            </button>

            <button
              className="secondary-action"
              onClick={() => {
                setStep('choose');
                setSpotId(null);
              }}
            >
              Not here? Choose another spot
            </button>
          </>
        )}

        {/* STEP 4: Simulated parking session */}
        {step === 'parked' && (
          <>
            <h2>✓ You're parked (demo)</h2>

            <div className="spot-hero spot-hero-blue">
              <small>YOUR DEMO SPOT</small>
              <strong>{spotId}</strong>
              <span>{deck.name} · Level {spotLevel}</span>
            </div>

            <div className="flow-instructions">
              <p><strong>Started:</strong> {timeText(startedAt)}</p>
              <p>
                <strong>Status:</strong> Simulated parking
                session in this browser tab.
              </p>
              <p>Tap out when you're ready to leave.</p>
            </div>

            <button
              className="danger-action"
              onClick={() => {
                setEndedAt(new Date());
                setStep('summary');
              }}
            >
              Tap out · I'm leaving
            </button>
          </>
        )}

        {/* STEP 5: Parking summary */}
        {step === 'summary' && (
          <>
            <div className="thanks">✓</div>

            <h2>Thanks for trying SmartPark!</h2>

            <p className="flow-muted">
              Your demonstration parking session has ended.
            </p>

            <div className="flow-instructions">
              <p><strong>Deck:</strong> {deck.name}</p>
              <p><strong>Spot:</strong> {spotId} · Level {spotLevel}</p>
              <p><strong>Tap in:</strong> {timeText(startedAt)}</p>
              <p><strong>Tap out:</strong> {timeText(endedAt)}</p>
              <p><strong>Duration:</strong> {duration} minutes</p>
            </div>

            <button
              className="primary-action"
              onClick={reset}
            >
              See spots again
            </button>

            <button
              className="secondary-action"
              onClick={onBack}
            >
              Back to all decks
            </button>
          </>
        )}

      </div>
    </section>
  );
}
