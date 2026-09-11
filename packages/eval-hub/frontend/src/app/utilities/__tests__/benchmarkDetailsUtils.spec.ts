import { toggleBenchmarkSelectionKey } from '~/app/utilities/benchmarkDetailsUtils';

describe('benchmarkDetailsUtils', () => {
  describe('toggleBenchmarkSelectionKey', () => {
    it('should add a benchmark key when it is not selected', () => {
      expect(toggleBenchmarkSelectionKey(['a:1'], 'b:2', 10)).toEqual(['a:1', 'b:2']);
    });

    it('should remove a benchmark key when it is already selected', () => {
      expect(toggleBenchmarkSelectionKey(['a:1', 'b:2'], 'a:1', 10)).toEqual(['b:2']);
    });

    it('should not exceed the maximum number of benchmarks', () => {
      const selected = Array.from({ length: 10 }, (_, index) => `provider:bench-${index}`);

      expect(toggleBenchmarkSelectionKey(selected, 'provider:new', 10)).toEqual(selected);
    });
  });
});
