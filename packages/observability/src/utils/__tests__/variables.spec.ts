import { CLUSTER_DETAILS_VARIABLES, isClusterDetailsVariable } from '../variables';

describe('isClusterDetailsVariable', () => {
  it('should return true for all known cluster details variables', () => {
    Object.values(CLUSTER_DETAILS_VARIABLES).forEach((variable) => {
      expect(isClusterDetailsVariable(variable)).toBe(true);
    });
  });

  it('should return false for unknown variables', () => {
    expect(isClusterDetailsVariable('CLUSTER_DETAILS_UNKNOWN')).toBe(false);
    expect(isClusterDetailsVariable('OTHER_PREFIX_VARIABLE')).toBe(false);
    expect(isClusterDetailsVariable('CLUSTER_DETAILS_API_SERVER_EXTRA')).toBe(false);
    expect(isClusterDetailsVariable('CLUSTER_DETAILS_')).toBe(false);
    expect(isClusterDetailsVariable('')).toBe(false);
  });
});
