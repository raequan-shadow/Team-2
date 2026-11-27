import React from 'react';
import { useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import SearchBar from './components/SearchBar.jsx';
import DeckList from './components/DeckList.jsx';
import EmptyState from './components/EmptyState.jsx';
import { useParkingAvailability } from './hooks/useParkingAvailability.js';
import ParkingFlow from './components/ParkingFlow.jsx';
import StatusLegend from './components/StatusLegend.jsx';
import StaffDashboard from './components/StaffDashboard.jsx';
import NearbyParking from './components/NearbyParking.jsx';
import { availableSpaces } from './utils/parkingLogic.js';

export default function App() {
  const { decks, loading, error, lastRefresh } = useParkingAvailability();
  const [query, setQuery] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [view, setView] = useState('drivers');
  const filtered = useMemo(() => decks.filter(deck => `${deck.name} ${deck.location}`.toLowerCase().includes(query.toLowerCase().trim())), [decks, query]);
  const availableTotal = decks.reduce((sum, deck) => sum + (availableSpaces(deck) ?? 0), 0);
  const reporting = decks.filter(d => availableSpaces(d) !== null).length;

  const chosenDeck = decks.find(deck => deck.id === selectedDeckId);
  const tabs = [['drivers', 'Find parking'], ['nearby', 'Nearby parking'], ['staff', 'PATS staff']];
  const chooseDeck = id => { setSelectedDeckId(id); setView('drivers'); window.scrollTo({top:0,behavior:'smooth'}); };
  return <><Header/><main className="page">
    <nav className="view-tabs" aria-label="Views">{tabs.map(([id, label]) => <button key={id} type="button" className="level-tab" aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</nav>
    {view === 'staff' ? <StaffDashboard decks={decks} lastRefresh={lastRefresh} error={error}/>
    : view === 'nearby' ? (error ? <EmptyState message={error}/> : <NearbyParking decks={decks} onChoose={chooseDeck}/>) : <>
    {selectedDeckId && <ParkingFlow deck={chosenDeck} onBack={() => setSelectedDeckId(null)} />}
    <div className="intro"><p className="eyebrow"></p><h1>Find your next parking spot.</h1><p className="intro-copy">Compare real-time available parking at campus decks.</p></div>
    {/*<div className="intro"><p className="eyebrow">SPRINT 1 · PARKING OVERVIEW</p><h1>Find your next parking spot.</h1><p className="intro-copy">Compare available parking at campus decks before you leave. This is a demonstration using simulated occupancy.</p></div>*/}
    <section className="overview" aria-label="Parking overview"><div><span className="overview-label">Parking decks</span><strong>{decks.length}</strong></div><div><span className="overview-label">Spaces available</span><strong>{availableTotal.toLocaleString()}</strong></div><div><span className="overview-label">Reporting decks</span><strong>{reporting}/{decks.length}</strong></div></section>
    <section className="listing"><div className="listing-heading"><div><h2>Parking availability</h2><p>Updates automatically every 30 seconds while this page is open.</p></div><span className="updated">{lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}` : 'Loading...'}</span></div>
      <SearchBar value={query} onChange={setQuery}/>
      <StatusLegend/>
      {loading ? <EmptyState message="Loading demo parking data..."/> : error ? <EmptyState message={error}/> : filtered.length === 0 ? <EmptyState message="No parking decks match that search."/> : <DeckList decks={filtered} expandedId={expandedId} onExpand={setExpandedId} onChoose={chooseDeck}/>}
     </section>
    </>}
     <footer>Disclaimer: All data displayed on the website is simulated and for demonstration purposes only and does not represent actual UNC Charlotte parking availability.</footer>
     {/*<footer>SmartPark · Student prototype · Simulated data only — not actual UNC Charlotte parking availability.</footer>*/}
    
  </main></>;
}
