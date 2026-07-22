/** Encode option ids for stable, injective DOM id segments (e.g. 'a b' vs 'a-b'). */
export const encodeOptionIdForDom = (optionId: number | string): string =>
  String(optionId)
    .replace(/u/g, 'uu')
    .replace(/[^a-zA-Z0-9_-]/g, (ch) => `u${ch.charCodeAt(0)}u`);

export const createOptionElementId = (instanceId: string, optionId: number | string): string =>
  `${instanceId}-option-${encodeOptionIdForDom(optionId)}`;
