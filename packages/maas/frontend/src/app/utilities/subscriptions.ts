/**
 * Returns the lowest non-negative integer priority not already taken by existing subscriptions.
 * Starts scanning from `startFrom` (default 0) and increments until a free slot is found.
 */
export const getLowestAvailablePriority = (
  subscriptions: { priority?: number }[],
  startFrom = 0,
): number => {
  const taken = new Set(subscriptions.map((s) => s.priority ?? 0));
  let p = startFrom;
  while (taken.has(p)) {
    p += 1;
  }
  return p;
};
