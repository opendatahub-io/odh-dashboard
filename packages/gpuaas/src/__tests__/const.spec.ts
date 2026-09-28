import { QUOTA_USAGE_BORROWING } from '../const';

describe('QUOTA_USAGE_BORROWING', () => {
  describe('cohortCalloutPrefix', () => {
    it('uses the singular accelerator form for one borrowed accelerator', () => {
      expect(QUOTA_USAGE_BORROWING.cohortCalloutPrefix(1)).toBe(
        ' is borrowing 1 accelerator from ',
      );
    });

    it('uses the plural accelerator form for multiple borrowed accelerators', () => {
      expect(QUOTA_USAGE_BORROWING.cohortCalloutPrefix(2)).toBe(
        ' is borrowing 2 accelerators from ',
      );
    });
  });
});
