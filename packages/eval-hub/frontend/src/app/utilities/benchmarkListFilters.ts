import {
  BenchmarkFilterDataType,
  BenchmarkFilterOptions,
  BenchmarkSortOption,
} from '~/app/pages/const';

export type BenchmarkFilterable = {
  id: string;
  name: string;
  category?: string;
  metrics?: string[];
};

export const BENCHMARK_SORT_VALUES: readonly string[] = Object.values(BenchmarkSortOption);

export const isBenchmarkSortOption = (value: unknown): value is BenchmarkSortOption =>
  typeof value === 'string' && BENCHMARK_SORT_VALUES.includes(value);

export const getAvailableCategories = (benchmarks: BenchmarkFilterable[]): string[] =>
  // eslint-disable-next-line no-restricted-properties
  [...new Set(benchmarks.map((b) => b.category).filter((c): c is string => Boolean(c)))].sort();

export const getAvailableMetrics = (benchmarks: BenchmarkFilterable[]): string[] =>
  // eslint-disable-next-line no-restricted-properties
  [...new Set(benchmarks.flatMap((b) => b.metrics ?? []).filter(Boolean))].sort();

export const hasActiveBenchmarkFilters = (filterData: BenchmarkFilterDataType): boolean =>
  filterData[BenchmarkFilterOptions.name].trim() !== '' ||
  filterData[BenchmarkFilterOptions.category].length > 0 ||
  filterData[BenchmarkFilterOptions.metrics].length > 0;

const compareBenchmarkNames = (a: BenchmarkFilterable, b: BenchmarkFilterable): number =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

export const filterBenchmarks = <T extends BenchmarkFilterable>(
  benchmarks: T[],
  filterData: BenchmarkFilterDataType,
): T[] => {
  const nameFilter = filterData[BenchmarkFilterOptions.name].toLowerCase().trim() || undefined;
  const categoryFilters = filterData[BenchmarkFilterOptions.category];
  const metricsFilters = filterData[BenchmarkFilterOptions.metrics];

  return benchmarks.filter((b) => {
    if (
      nameFilter &&
      !b.name.toLowerCase().includes(nameFilter) &&
      !b.id.toLowerCase().includes(nameFilter)
    ) {
      return false;
    }
    if (categoryFilters.length > 0 && !categoryFilters.includes(b.category ?? '')) {
      return false;
    }
    if (
      metricsFilters.length > 0 &&
      !(b.metrics?.some((m) => metricsFilters.includes(m)) ?? false)
    ) {
      return false;
    }
    return true;
  });
};

export const sortBenchmarks = <T extends BenchmarkFilterable>(
  benchmarks: T[],
  sortOption: BenchmarkSortOption,
): T[] => {
  switch (sortOption) {
    case BenchmarkSortOption.NAME:
      // eslint-disable-next-line no-restricted-properties
      return [...benchmarks].sort(compareBenchmarkNames);
    case BenchmarkSortOption.CATEGORY:
      // eslint-disable-next-line no-restricted-properties
      return [...benchmarks].sort((a, b) => {
        const catCmp = (a.category ?? '').localeCompare(b.category ?? '', undefined, {
          sensitivity: 'base',
        });
        return catCmp !== 0 ? catCmp : compareBenchmarkNames(a, b);
      });
    default:
      return benchmarks;
  }
};
