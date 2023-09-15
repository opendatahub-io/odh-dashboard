import { isCpuLimitEqual, isMemoryLimitEqual } from '~/utilities/valueUnits';

describe('isCpuLimitEqual', () => {
  test('correctly compares non-undefined values', () => {
    expect(isCpuLimitEqual('1', '1')).toBe(true);
    expect(isCpuLimitEqual('1000m', '1')).toBe(true);
    expect(isCpuLimitEqual('1001m', '1')).toBe(false);
  });
  test('correctly compares undefined values', () => {
    expect(isCpuLimitEqual('1000m', undefined)).toBe(false);
    expect(isCpuLimitEqual('1', undefined)).toBe(false);
    expect(isCpuLimitEqual(undefined, undefined)).toBe(true);
  });
});

describe('isMemoryLimitEqual', () => {
  test('correctly compares non-undefined values', () => {
    expect(isMemoryLimitEqual('1Gi', '1Gi')).toBe(true);
    expect(isMemoryLimitEqual('1Gi', '1024Mi')).toBe(true);
    expect(isMemoryLimitEqual('1Gi', '1025Mi')).toBe(false);
  });
  test('correctly compares undefined values', () => {
    expect(isMemoryLimitEqual('1Gi', undefined)).toBe(false);
    expect(isMemoryLimitEqual('1024Mi', undefined)).toBe(false);
    expect(isMemoryLimitEqual(undefined, undefined)).toBe(true);
  });
});
