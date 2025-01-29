/**
 * Splits a string into a numeric part and a unit part
 * @param value The input string to be split.
 * @returns [numberPart, unitPart]
 */
export const extractNumberAndTimeUnit = (value: string): [number, string] => {
  const trimmedValue = value.trim();

  const match = trimmedValue.match(/^([+-]?\d+(\.\d+)?([eE][+-]?\d+)?)([a-zA-Z]*)$/);
  if (match) {
    const numericPart = parseFloat(match[1]);
    const unitPart = match[4] || '';
    return [numericPart, unitPart];
  }

  // The required minimum numeric value is set to 1
  return [1, trimmedValue];
};
