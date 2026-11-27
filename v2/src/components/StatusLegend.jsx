import React from 'react';

export default function StatusLegend() {
  return <ul className="status-legend" aria-label="Availability color key">
    <li><span className="badge badge-green">Available</span> 20% or more open</li>
    <li><span className="badge badge-yellow">Limited spaces</span> 5–19% open</li>
    <li><span className="badge badge-red">Almost full</span> under 5% open</li>
  </ul>;
}
