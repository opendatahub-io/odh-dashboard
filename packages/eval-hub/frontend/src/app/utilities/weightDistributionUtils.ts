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

  const rankedEntries = exact.map((value, index) => ({
    index,
    fraction: value - Math.floor(value),
  }));
  // eslint-disable-next-line no-restricted-properties
  const ranked = [...rankedEntries].sort((a, b) => b.fraction - a.fraction);

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

const clampPercent = (value: number, minPercent: number, maxPercent: number): number =>
  Math.max(minPercent, Math.min(maxPercent, Math.round(value)));

const distributeIntegerPercentages = (weights: number[], total: number): number[] => {
  if (weights.length === 0) {
    return [];
  }

  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const exact =
    weightTotal > 0
      ? weights.map((weight) => (Math.max(0, weight) / weightTotal) * total)
      : weights.map(() => total / weights.length);
  const integers = exact.map(Math.floor);
  const remainder = total - integers.reduce((sum, value) => sum + value, 0);
  const rankedEntries = exact.map((value, index) => ({
    index,
    fraction: value - Math.floor(value),
  }));
  // eslint-disable-next-line no-restricted-properties
  const ranked = [...rankedEntries].sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let index = 0; index < remainder; index += 1) {
    integers[ranked[index].index] += 1;
  }

  return integers;
};

/** Change one benchmark's share and redistribute the remainder across the others. */
export const redistributeWeight = (
  percentages: number[],
  changedIndex: number,
  newValue: number,
  minPercent = MIN_SEGMENT_PERCENT,
): number[] => {
  const count = percentages.length;
  if (count === 0) {
    return [];
  }
  if (count === 1) {
    return [100];
  }
  if (!Number.isInteger(changedIndex) || changedIndex < 0 || changedIndex >= count) {
    return percentages;
  }

  const effectiveMinPercent = Math.min(
    Math.max(0, Math.round(minPercent)),
    Math.floor(100 / count),
  );
  const maxForChanged = 100 - (count - 1) * effectiveMinPercent;
  const clampedNew = clampPercent(newValue, effectiveMinPercent, maxForChanged);
  const otherIndices = percentages
    .map((_, index) => index)
    .filter((index) => index !== changedIndex);
  const remainder = 100 - clampedNew;
  const distributableRemainder = remainder - otherIndices.length * effectiveMinPercent;
  const otherWeights = otherIndices.map((index) =>
    Math.max(0, percentages[index] - effectiveMinPercent),
  );
  const redistributed = distributeIntegerPercentages(otherWeights, distributableRemainder);

  const next = percentages.map((percentage, index) => {
    if (index === changedIndex) {
      return clampedNew;
    }
    const otherIndex = otherIndices.indexOf(index);
    return effectiveMinPercent + redistributed[otherIndex];
  });

  return next;
};
