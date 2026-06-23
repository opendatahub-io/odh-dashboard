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

export const MEMORY_UNITS_FOR_PARSING: UnitOption[] = [
  { name: 'EB', unit: 'E', weight: 1000 ** 6 },
  { name: 'EiB', unit: 'Ei', weight: 1024 ** 6 },
  { name: 'PB', unit: 'P', weight: 1000 ** 5 },
  { name: 'PiB', unit: 'Pi', weight: 1024 ** 5 },
  { name: 'TB', unit: 'T', weight: 1000 ** 4 },
  { name: 'TiB', unit: 'Ti', weight: 1024 ** 4 },
  { name: 'GB', unit: 'G', weight: 1000 ** 3 },
  { name: 'GiB', unit: 'Gi', weight: 1024 ** 3 },
  { name: 'MB', unit: 'M', weight: 1000 ** 2 },
  { name: 'MiB', unit: 'Mi', weight: 1024 ** 2 },
  { name: 'KB', unit: 'K', weight: 1000 },
  { name: 'KiB', unit: 'Ki', weight: 1024 },
  { name: 'B', unit: '', weight: 1 },
];

export const formatMemory = <T extends ValueUnitString | undefined>(
  value: T,
): T | ValueUnitString => {
  if (!value) {
    return value;
  }

  const match = value.match(/^(\d*\.?\d*)(.*)$/);
  if (!(match && match[1] && match[2])) {
    return value;
  }
  return `${match[1]}${
    MEMORY_UNITS_FOR_PARSING.find((o) => o.unit === match[2])?.name || match[2]
  }`;
};
