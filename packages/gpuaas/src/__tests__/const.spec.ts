import {
  ADMIN_INFRASTRUCTURE_TABS,
  getDefaultInfrastructureTab,
  getVisibleInfrastructureTabs,
  QUOTA_USAGE_BORROWING,
  USER_INFRASTRUCTURE_TABS,
} from '../const';

describe('getDefaultInfrastructureTab', () => {
  it('should default admin users to Accelerator utilization', () => {
    expect(getDefaultInfrastructureTab(ADMIN_INFRASTRUCTURE_TABS)).toBe('utilization');
  });

  it('should default non-admin users to Workloads', () => {
    expect(getDefaultInfrastructureTab(USER_INFRASTRUCTURE_TABS)).toBe('workloads');
  });
});

describe('getVisibleInfrastructureTabs', () => {
  it('should return all Infrastructure tabs for users with admin tab access', () => {
    expect(getVisibleInfrastructureTabs(true).map((tab) => tab.id)).toEqual([
      'utilization',
      'quota-usage',
      'workloads',
    ]);
  });

  it('should return only the Workloads tab for users without admin tab access', () => {
    expect(getVisibleInfrastructureTabs(false).map((tab) => tab.id)).toEqual(['workloads']);
  });
});

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
