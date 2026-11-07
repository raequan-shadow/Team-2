import React from "react";
export default function SearchBar({ value, onChange }) {
  return <label className="search-wrap"><span className="search-label">Find a parking deck or nearby building</span><div className="search-field"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search decks or locations..." value={value} onChange={e => onChange(e.target.value)} /></div></label>;
}
