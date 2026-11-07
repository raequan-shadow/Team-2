import React from "react";
import { useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import SearchBar from './components/SearchBar.jsx';
import DeckList from './components/DeckList.jsx';
import EmptyState from './components/EmptyState.jsx';
import { useParkingAvailability } from './hooks/useParkingAvailability.js';
import { availableSpaces } from './utils/parkingLogic.js';

export default function App() {
  const { decks, loading, error, lastRefresh } = useParkingAvailability();
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const filtered = useMemo(() => decks.filter(deck => `${deck.name} ${deck.location}`.toLowerCase().includes(query.toLowerCase().trim())), [decks, query]);
  const availableTotal = decks.reduce((sum, deck) => sum + (availableSpaces(deck) ?? 0), 0);
  const reporting = decks.filter(d => availableSpaces(d) !== null).length;

  return <><Header/><main className="page">
    <div className="intro"><p className="eyebrow">SPRINT 1 · PARKING OVERVIEW</p><h1>Find your next parking spot.</h1><p className="intro-copy">Compare available parking at campus decks before you leave. This is a demonstration using simulated occupancy.</p></div>
    <section className="overview" aria-label="Parking overview"><div><span className="overview-label">Parking decks</span><strong>{decks.length}</strong></div><div><span className="overview-label">Spaces available</span><strong>{availableTotal.toLocaleString()}</strong></div><div><span className="overview-label">Reporting decks</span><strong>{reporting}/{decks.length}</strong></div></section>
    <section className="listing"><div className="listing-heading"><div><h2>Parking availability</h2><p>Updates automatically every 30 seconds while this page is open.</p></div><span className="updated">{lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}` : 'Loading...'}</span></div>
      <SearchBar value={query} onChange={setQuery}/>
      {loading ? <EmptyState message="Loading demo parking data..."/> : error ? <EmptyState message={error}/> : filtered.length === 0 ? <EmptyState message="No parking decks match that search."/> : <DeckList decks={filtered} expandedId={expandedId} onExpand={setExpandedId}/>}
    </section>
    <footer>SmartPark · Student prototype · Simulated data only — not actual UNC Charlotte parking availability.</footer>
  </main></>;
}
