/**
 * Format: '{value: number}{unit: string}'
 * eg. 1Unit; 100Mi; 10Gi; 5m
 */
export type ValueUnitString = string;

export type UnitOption = {
  name: string;
  unit: string;
  /** How much to multiply the unit value to get it to the same unit as the lowest unit */
  weight: number;
};

export const CPU_UNITS: UnitOption[] = [
  { name: 'Cores', unit: '', weight: 1000 },
  { name: 'Milicores', unit: 'm', weight: 1 },
];
export const MEMORY_UNITS: UnitOption[] = [
  { name: 'Gi', unit: 'Gi', weight: 1024 },
  { name: 'Mi', unit: 'Mi', weight: 1 },
];

export const splitValueUnit = (
  value: ValueUnitString,
  options: UnitOption[],
): [value: number, unit: UnitOption] => {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) {
    // Unable to match a legit value -- default back to base
    return [1, options[0]];
  }
  const newValue = parseInt(match[1]) || 1; // avoid NaN
  const foundUnit = options.find((o) => o.unit === match[2]);
  const newUnit = foundUnit || options[0]; // escape hatch -- unsure what the unit can be
  return [newValue, newUnit];
};

/** value1 is larger that value2 */
export const isLarger = (
  value1: ValueUnitString,
  value2: ValueUnitString,
  units: UnitOption[],
  isEqualOkay = false,
): boolean => {
  const [val1, unit1] = splitValueUnit(value1, units);
  const [val2, unit2] = splitValueUnit(value2, units);

  const delta = val1 * unit1.weight - val2 * unit2.weight;
  return isEqualOkay ? delta >= 0 : delta > 0;
};

export const isCpuLimitLarger = (
  requestCpu?: ValueUnitString,
  limitCpu?: ValueUnitString,
  isEqualOkay = false,
): boolean => {
  if (!requestCpu || !limitCpu) return true;

  return isLarger(limitCpu, requestCpu, CPU_UNITS, isEqualOkay);
};

export const isMemoryLimitLarger = (
  requestMemory?: ValueUnitString,
  limitMemory?: ValueUnitString,
  isEqualOkay = false,
): boolean => {
  if (requestMemory == null || limitMemory == null) return true;

  return isLarger(limitMemory, requestMemory, MEMORY_UNITS, isEqualOkay);
};
