import React from 'react';

// Shared legend dot used by ROC and Precision-Recall chart legends.
type ChartLegendDotProps = { color: string };

const ChartLegendDot: React.FC<ChartLegendDotProps> = ({ color }) => (
  <svg width="12" height="12">
    <circle cx="6" cy="6" r="5" fill="none" stroke={color} strokeWidth="2" />
  </svg>
);

export default ChartLegendDot;
