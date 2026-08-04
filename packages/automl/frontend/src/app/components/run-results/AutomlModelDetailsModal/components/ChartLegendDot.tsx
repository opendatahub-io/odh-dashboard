import React from 'react';

// Shared legend dot used by ROC and Precision-Recall chart legends.
type ChartLegendDotProps = { color: string };

const ChartLegendDot: React.FC<ChartLegendDotProps> = ({ color }) => (
  <svg width="10" height="10" aria-hidden>
    <rect width="10" height="10" rx="2" fill={color} />
  </svg>
);

export default ChartLegendDot;
