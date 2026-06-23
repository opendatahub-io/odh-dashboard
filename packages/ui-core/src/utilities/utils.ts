export const normalizeBetween = (value: number, min?: number, max?: number): number => {
  let returnedValue = value;
  if (min !== undefined && max !== undefined) {
    returnedValue = Math.max(Math.min(value, max), min);
  } else if (min && value <= min) {
    returnedValue = min;
  } else if (max && value >= max) {
    returnedValue = max;
  }
  return Math.floor(returnedValue);
};
