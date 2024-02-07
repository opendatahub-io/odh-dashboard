/**
 * Format: '{value: number}{unit: string}'
 * eg. 1Unit; 100Mi; 10Gi; 5m
 */
export type ValueUnitString = string;

/**
 * Format: '{value: number}'
 * eg. 1; "1"
 */
export type ValueUnitCPU = string | number;

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
  const match = value.match(/^(\d*\.?\d*)(.*)$/);
  if (!match) {
    // Unable to match a legit value -- default back to base
    return [1, options[0]];
  }
  const newValue = Number(match[1]) || 1; // avoid NaN
  const foundUnit = options.find((o) => o.unit === match[2]);
  const newUnit = foundUnit || options[0]; // escape hatch -- unsure what the unit can be
  return [newValue, newUnit];
};

const calculateDelta = (
  value1: ValueUnitString,
  value2: ValueUnitString,
  units: UnitOption[],
): number => {
  const [val1, unit1] = splitValueUnit(value1, units);
  const [val2, unit2] = splitValueUnit(value2, units);
  return val1 * unit1.weight - val2 * unit2.weight;
};

export const isEqual = (
  value1: ValueUnitString,
  value2: ValueUnitString,
  units: UnitOption[],
): boolean => calculateDelta(value1, value2, units) === 0;

export const isCpuResourceEqual = (cpu1?: ValueUnitCPU, cpu2?: ValueUnitCPU): boolean => {
  const cpu1String = typeof cpu1 === 'number' ? `${cpu1}` : cpu1;
  const cpu2String = typeof cpu2 === 'number' ? `${cpu2}` : cpu2;

  if (!cpu1String && !cpu2String) {
    return true;
  }

  if (!cpu1String || !cpu2String) {
    return false;
  }

  return isEqual(cpu1String, cpu2String, CPU_UNITS);
};

export const isMemoryResourceEqual = (
  memory1?: ValueUnitString,
  memory2?: ValueUnitString,
): boolean => {
  if (!memory1 && !memory2) {
    return true;
  }

  if (!memory1 || !memory2) {
    return false;
  }

  return isEqual(memory1, memory2, MEMORY_UNITS);
};

/** value1 is larger that value2 */
export const isLarger = (
  value1: ValueUnitString,
  value2: ValueUnitString,
  units: UnitOption[],
  isEqualOkay = false,
): boolean => {
  const delta = calculateDelta(value1, value2, units);
  return isEqualOkay ? delta >= 0 : delta > 0;
};

export const isCpuLimitLarger = (
  requestCpu?: ValueUnitCPU,
  limitCpu?: ValueUnitCPU,
  isEqualOkay = false,
): boolean => {
  const requestCpuString = typeof requestCpu === 'number' ? `${requestCpu}` : requestCpu;
  const limitCpuString = typeof limitCpu === 'number' ? `${limitCpu}` : limitCpu;

  if (!limitCpuString || !requestCpuString) {
    return false;
  }

  return isLarger(limitCpuString, requestCpuString, CPU_UNITS, isEqualOkay);
};

export const isMemoryLimitLarger = (
  requestMemory?: ValueUnitString,
  limitMemory?: ValueUnitString,
  isEqualOkay = false,
): boolean => {
  if (!limitMemory || !requestMemory) {
    return false;
  }

  return isLarger(limitMemory, requestMemory, MEMORY_UNITS, isEqualOkay);
};
