import React from 'react';
import { availabilityStatus } from '../utils/parkingLogic.js';
export default function AvailabilityBadge({ deck }) {
  const status = availabilityStatus(deck);
  const labels = { Green: 'Available', Yellow: 'Limited spaces', Red: 'Almost full', Unavailable: 'Unavailable' };
  return <span className={`badge badge-${status.toLowerCase()}`}>{labels[status]}</span>;
}
