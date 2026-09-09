import {
  adjustAdjacentPercentages,
  getDividerPosition,
  getWeightSegmentColor,
  percentagesToWeights,
  redistributeWeight,
  weightsToPercentages,
} from '~/app/utilities/weightDistributionUtils';

describe('weightDistributionUtils', () => {
  describe('weightsToPercentages', () => {
    it('should return integers that sum to 100', () => {
      expect(weightsToPercentages([3, 2, 3])).toEqual([38, 25, 37]);
      expect(weightsToPercentages([3, 2, 3]).reduce((sum, value) => sum + value, 0)).toBe(100);
    });

    it('should distribute six equal weights as 17/17/17/17/16/16', () => {
      expect(weightsToPercentages([1, 1, 1, 1, 1, 1])).toEqual([17, 17, 17, 17, 16, 16]);
    });
  });

  describe('getDividerPosition', () => {
    it('should return cumulative percentage boundaries', () => {
      const percentages = [17, 17, 17, 17, 16, 16];
      expect(getDividerPosition(percentages, 0)).toBe(17);
      expect(getDividerPosition(percentages, 4)).toBe(84);
    });
  });

  describe('percentagesToWeights', () => {
    it('should convert display percentages into decimal weights', () => {
      const weights = percentagesToWeights([38, 25, 37]);

      expect(weights).toEqual([0.38, 0.25, 0.37]);
      expect(weights.reduce((sum, value) => sum + value, 0)).toBe(1);
    });
  });

  describe('adjustAdjacentPercentages', () => {
    it('should preserve the total for the adjusted pair', () => {
      const next = adjustAdjacentPercentages([17, 17, 17, 17, 16, 16], 0, 20);
      expect(next[0]).toBe(20);
      expect(next[1]).toBe(14);
      expect(next.reduce((sum, value) => sum + value, 0)).toBe(100);
    });
  });

  describe('getWeightSegmentColor', () => {
    it('should follow the prototype palette order by index', () => {
      expect(getWeightSegmentColor(0)).toBe('rgb(0, 102, 204)');
      expect(getWeightSegmentColor(1)).toBe('rgb(0, 149, 150)');
      expect(getWeightSegmentColor(2)).toBe('rgb(132, 120, 222)');
    });
  });

  describe('redistributeWeight', () => {
    it('should keep the total at 100 when one benchmark changes', () => {
      const next = redistributeWeight([34, 33, 33], 0, 40);
      expect(next[0]).toBe(40);
      expect(next.reduce((sum, value) => sum + value, 0)).toBe(100);
    });

    it('should preserve the minimum for every benchmark at the maximum boundary', () => {
      const next = redistributeWeight([5, 85, 5, 5], 0, 85, 5);

      expect(next).toEqual([85, 5, 5, 5]);
      expect(next.every((percentage) => percentage >= 5)).toBe(true);
      expect(next.reduce((sum, value) => sum + value, 0)).toBe(100);
    });

    it('should restore the minimum for zero-weight benchmarks when redistributing', () => {
      const next = redistributeWeight([0, 100, 0, 0], 0, 85, 5);

      expect(next).toEqual([85, 5, 5, 5]);
    });
  });
});
