/** Encode option ids for stable, injective DOM id segments (e.g. 'a b' vs 'a-b', 1 vs '1'). */
export const encodeOptionIdForDom = (optionId: number | string): string => {
  const prefix = typeof optionId === 'number' ? 'n' : 's';
  const encoded = String(optionId)
    .replace(/u/g, 'uu')
    .replace(/[^a-zA-Z0-9_-]/g, (ch) => `u${ch.charCodeAt(0)}u`);
  return `${prefix}-${encoded}`;
};

export const createOptionElementId = (instanceId: string, optionId: number | string): string =>
  `${instanceId}-option-${encodeOptionIdForDom(optionId)}`;
