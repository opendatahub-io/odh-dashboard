export const MIN_SEGMENT_PERCENT = 1;

/** Prototype palette order: blue, teal, purple, gold, orange, green. */
export const WEIGHT_SEGMENT_COLORS = [
  'rgb(0, 102, 204)',
  'rgb(0, 149, 150)',
  'rgb(132, 120, 222)',
  'rgb(240, 171, 0)',
  'rgb(236, 122, 8)',
  'rgb(61, 115, 23)',
] as const;

export const getWeightSegmentColor = (index: number): string =>
  WEIGHT_SEGMENT_COLORS[index % WEIGHT_SEGMENT_COLORS.length];

/** Convert arbitrary weights into integer percentages that always sum to 100. */
export const weightsToPercentages = (weights: number[]): number[] => {
  if (weights.length === 0) {
    return [];
  }

  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    const even = Math.floor(100 / weights.length);
    const percentages = weights.map(() => even);
    percentages[0] += 100 - percentages.reduce((sum, value) => sum + value, 0);
    return percentages;
  }

  const exact = weights.map((weight) => (weight / total) * 100);
  const floors = exact.map((value) => Math.floor(value));
  const remainder = 100 - floors.reduce((sum, value) => sum + value, 0);

  const ranked = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .toSorted((a, b) => b.fraction - a.fraction);

  const percentages = [...floors];
  for (let i = 0; i < remainder; i += 1) {
    percentages[ranked[i].index] += 1;
  }

  return percentages;
};

export const getDividerPosition = (percentages: number[], dividerIndex: number): number =>
  percentages.slice(0, dividerIndex + 1).reduce((sum, value) => sum + value, 0);

export const adjustAdjacentPercentages = (
  percentages: number[],
  dividerIndex: number,
  nextLeftValue: number,
  minPercent = MIN_SEGMENT_PERCENT,
): number[] => {
  const pairTotal = percentages[dividerIndex] + percentages[dividerIndex + 1];
  const clampedLeft = Math.max(
    minPercent,
    Math.min(pairTotal - minPercent, Math.round(nextLeftValue)),
  );
  const next = [...percentages];
  next[dividerIndex] = clampedLeft;
  next[dividerIndex + 1] = pairTotal - clampedLeft;
  return next;
};

/** Convert display percentages into normalized decimal weights for the API. */
export const percentagesToWeights = (percentages: number[]): number[] =>
  percentages.map((percentage) => percentage / 100);
