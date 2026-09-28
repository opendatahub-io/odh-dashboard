export type ConfigPair = {
  key: string;
  value: string;
};

export const EMPTY_CONFIG_PAIR: ConfigPair = { key: '', value: '' };

export const configPairsToRecord = (pairs: ConfigPair[]): Record<string, string> | undefined => {
  const config = pairs.reduce<Record<string, string>>((acc, { key, value }) => {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (!trimmedKey || !trimmedValue) {
      return acc;
    }
    acc[trimmedKey] = trimmedValue;
    return acc;
  }, {});

  return Object.keys(config).length > 0 ? config : undefined;
};

export const recordToConfigPairs = (config?: Record<string, string>): ConfigPair[] =>
  config ? Object.entries(config).map(([key, value]) => ({ key, value })) : [];

export const countNonEmptyConfigPairs = (pairs: ConfigPair[]): number =>
  pairs.filter((pair) => pair.key.trim()).length;

export const getConfigPairsValidationError = (pairs: ConfigPair[]): string | undefined => {
  const seenKeys = new Set<string>();

  for (const { key, value } of pairs) {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();

    if (!trimmedKey && !trimmedValue) {
      continue;
    }

    if (!trimmedKey || !trimmedValue) {
      return 'Each configuration pair must include both a key and a value';
    }

    if (/\s/.test(trimmedKey)) {
      return 'Configuration keys cannot contain spaces';
    }

    if (seenKeys.has(trimmedKey)) {
      return 'Configuration keys must be unique';
    }
    seenKeys.add(trimmedKey);
  }

  return undefined;
};
