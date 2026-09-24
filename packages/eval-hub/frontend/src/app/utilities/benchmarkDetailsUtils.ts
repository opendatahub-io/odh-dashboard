import type { FlatBenchmark, Provider } from '~/app/types';

export const buildFlatBenchmarkByKey = (providers: Provider[]): Map<string, FlatBenchmark> => {
  const map = new Map<string, FlatBenchmark>();

  providers.forEach((provider) => {
    (provider.benchmarks ?? []).forEach((benchmark) => {
      const key = `${provider.resource.id}:${benchmark.id}`;
      map.set(key, {
        ...benchmark,
        providerId: provider.resource.id,
        providerName: provider.title ?? provider.name,
        providerAgent: provider.agent,
      });
    });
  });

  return map;
};

export const toggleBenchmarkSelectionKey = (
  selectedKeys: string[],
  key: string,
  maxBenchmarks: number,
): string[] => {
  if (selectedKeys.includes(key)) {
    return selectedKeys.filter((item) => item !== key);
  }
  if (selectedKeys.length >= maxBenchmarks) {
    return selectedKeys;
  }
  return [...selectedKeys, key];
};
