import {
  BenchmarkFilterOptions,
  BenchmarkSortOption,
  initialBenchmarkFilterData,
} from '~/app/pages/const';
import {
  filterBenchmarks,
  getAvailableCategories,
  getAvailableMetrics,
  hasActiveBenchmarkFilters,
  isBenchmarkSortOption,
  sortBenchmarks,
  type BenchmarkFilterable,
} from '~/app/utilities/benchmarkListFilters';

const benchmarks: BenchmarkFilterable[] = [
  {
    id: 'arc_easy',
    name: 'Basic science Q&A',
    category: 'Reasoning',
    metrics: ['accuracy', 'f1'],
  },
  {
    id: 'inspect/arc',
    name: 'ARC',
    category: 'Reasoning',
    metrics: ['accuracy'],
  },
  {
    id: 'truthfulqa_mc1',
    name: 'TruthfulQA',
    category: 'Knowledge',
    metrics: ['accuracy'],
  },
];

describe('filterBenchmarks', () => {
  it('should return all benchmarks when no filters are applied', () => {
    expect(filterBenchmarks(benchmarks, initialBenchmarkFilterData)).toEqual(benchmarks);
  });

  it('should filter benchmarks by name', () => {
    const filtered = filterBenchmarks(benchmarks, {
      ...initialBenchmarkFilterData,
      [BenchmarkFilterOptions.name]: 'TruthfulQA',
    });

    expect(filtered.map((b) => b.id)).toEqual(['truthfulqa_mc1']);
  });

  it('should filter benchmarks by ID', () => {
    const filtered = filterBenchmarks(benchmarks, {
      ...initialBenchmarkFilterData,
      [BenchmarkFilterOptions.name]: 'arc_easy',
    });

    expect(filtered.map((b) => b.id)).toEqual(['arc_easy']);
  });

  it('should match benchmarks by partial ID', () => {
    const filtered = filterBenchmarks(benchmarks, {
      ...initialBenchmarkFilterData,
      [BenchmarkFilterOptions.name]: 'inspect/',
    });

    expect(filtered.map((b) => b.id)).toEqual(['inspect/arc']);
  });

  it('should match benchmarks by name or ID when input matches both', () => {
    const filtered = filterBenchmarks(benchmarks, {
      ...initialBenchmarkFilterData,
      [BenchmarkFilterOptions.name]: 'arc',
    });

    expect(filtered.map((b) => b.id)).toEqual(['arc_easy', 'inspect/arc']);
  });

  it('should filter benchmarks by ID case-insensitively', () => {
    const filtered = filterBenchmarks(benchmarks, {
      ...initialBenchmarkFilterData,
      [BenchmarkFilterOptions.name]: 'ARC_EASY',
    });

    expect(filtered.map((b) => b.id)).toEqual(['arc_easy']);
  });

  it('should filter benchmarks by category', () => {
    const filtered = filterBenchmarks(benchmarks, {
      ...initialBenchmarkFilterData,
      [BenchmarkFilterOptions.category]: ['Knowledge'],
    });

    expect(filtered.map((b) => b.id)).toEqual(['truthfulqa_mc1']);
  });

  it('should filter benchmarks by metrics', () => {
    const filtered = filterBenchmarks(benchmarks, {
      ...initialBenchmarkFilterData,
      [BenchmarkFilterOptions.metrics]: ['f1'],
    });

    expect(filtered.map((b) => b.id)).toEqual(['arc_easy']);
  });

  it('should combine name and category filters', () => {
    const filtered = filterBenchmarks(benchmarks, {
      ...initialBenchmarkFilterData,
      [BenchmarkFilterOptions.name]: 'arc',
      [BenchmarkFilterOptions.category]: ['Reasoning'],
    });

    expect(filtered.map((b) => b.id)).toEqual(['arc_easy', 'inspect/arc']);
  });
});

describe('sortBenchmarks', () => {
  it('should preserve provider order for the default sort option', () => {
    expect(sortBenchmarks(benchmarks, BenchmarkSortOption.DEFAULT)).toEqual(benchmarks);
  });

  it('should sort benchmarks alphabetically by name', () => {
    expect(sortBenchmarks(benchmarks, BenchmarkSortOption.NAME).map((b) => b.id)).toEqual([
      'inspect/arc',
      'arc_easy',
      'truthfulqa_mc1',
    ]);
  });

  it('should sort benchmark names case-insensitively', () => {
    const caseBenchmarks: BenchmarkFilterable[] = [
      { id: 'lower', name: 'alpha', category: 'Reasoning', metrics: ['accuracy'] },
      { id: 'upper', name: 'Alpha', category: 'Reasoning', metrics: ['accuracy'] },
      { id: 'zeta', name: 'zeta', category: 'Reasoning', metrics: ['accuracy'] },
    ];

    expect(sortBenchmarks(caseBenchmarks, BenchmarkSortOption.NAME).map((b) => b.id)).toEqual([
      'lower',
      'upper',
      'zeta',
    ]);
  });

  it('should sort benchmarks by category then name', () => {
    expect(sortBenchmarks(benchmarks, BenchmarkSortOption.CATEGORY).map((b) => b.id)).toEqual([
      'truthfulqa_mc1',
      'inspect/arc',
      'arc_easy',
    ]);
  });
});

describe('getAvailableCategories', () => {
  it('should return sorted unique categories', () => {
    expect(getAvailableCategories(benchmarks)).toEqual(['Knowledge', 'Reasoning']);
  });
});

describe('getAvailableMetrics', () => {
  it('should return sorted unique metrics', () => {
    expect(getAvailableMetrics(benchmarks)).toEqual(['accuracy', 'f1']);
  });
});

describe('hasActiveBenchmarkFilters', () => {
  it('should return false when no filters are active', () => {
    expect(hasActiveBenchmarkFilters(initialBenchmarkFilterData)).toBe(false);
  });

  it('should return true when any filter is active', () => {
    expect(
      hasActiveBenchmarkFilters({
        ...initialBenchmarkFilterData,
        [BenchmarkFilterOptions.name]: 'arc',
      }),
    ).toBe(true);
  });
});

describe('isBenchmarkSortOption', () => {
  it('should validate benchmark sort option values', () => {
    expect(isBenchmarkSortOption(BenchmarkSortOption.NAME)).toBe(true);
    expect(isBenchmarkSortOption('invalid')).toBe(false);
  });
});
