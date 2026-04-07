import { getLowestAvailablePriority } from '~/app/utilities/subscriptions';

describe('getLowestAvailablePriority', () => {
  it('should return 0 when there are no subscriptions', () => {
    expect(getLowestAvailablePriority([])).toBe(0);
  });

  it('should return the first gap when priorities are contiguous from 0', () => {
    const subs = [{ priority: 0 }, { priority: 1 }, { priority: 2 }];
    expect(getLowestAvailablePriority(subs)).toBe(3);
  });

  it('should return 0 when no subscription uses priority 0', () => {
    const subs = [{ priority: 5 }, { priority: 10 }];
    expect(getLowestAvailablePriority(subs)).toBe(0);
  });

  it('should fill gaps in non-contiguous priorities', () => {
    const subs = [{ priority: 0 }, { priority: 2 }, { priority: 4 }];
    expect(getLowestAvailablePriority(subs)).toBe(1);
  });

  it('should treat undefined priority as 0', () => {
    const subs = [{ priority: undefined }, { priority: 1 }];
    expect(getLowestAvailablePriority(subs)).toBe(2);
  });

  it('should treat missing priority as 0', () => {
    const subs = [{}, { priority: 1 }];
    expect(getLowestAvailablePriority(subs)).toBe(2);
  });

  it('should respect startFrom parameter', () => {
    const subs = [{ priority: 0 }, { priority: 1 }, { priority: 2 }];
    expect(getLowestAvailablePriority(subs, 2)).toBe(3);
  });

  it('should return startFrom directly when it is not taken', () => {
    const subs = [{ priority: 0 }, { priority: 1 }];
    expect(getLowestAvailablePriority(subs, 5)).toBe(5);
  });

  it('should skip consecutive taken values after startFrom', () => {
    const subs = [{ priority: 3 }, { priority: 4 }, { priority: 5 }];
    expect(getLowestAvailablePriority(subs, 3)).toBe(6);
  });

  it('should handle duplicate priorities', () => {
    const subs = [{ priority: 0 }, { priority: 0 }, { priority: 1 }];
    expect(getLowestAvailablePriority(subs)).toBe(2);
  });
});
