/**
 * Returns a GB value. Will return 1 decimal point, unless it is less than 0.1, then it will
 * return 2 decimal points so the value is not rounded to zero.
 */
export const bytesAsGB = (bytes: number | typeof NaN): number => {
  if (Number.isNaN(bytes)) {
    return 0;
  }

  const asGigaBytes = bytes / 1024 / 1024 / 1024;

  return parseFloat(asGigaBytes.toFixed(asGigaBytes < 0.1 ? 2 : 1));
};
