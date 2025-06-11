import { isRefreshIntervalTitle, isTimeframeTitle } from '#~/concepts/metrics/utils';

describe('isTimeframeTitle', () => {
  it('works in the true case', () => {
    expect(isTimeframeTitle('24 hours')).toBe(true);
  });

  it('works in the false case', () => {
    expect(isTimeframeTitle('Something else')).toBe(false);
  });
});

describe('isRefreshIntervalTitle', () => {
  it('works in the true case', () => {
    expect(isRefreshIntervalTitle('30 minutes')).toBe(true);
  });

  it('works in the false case', () => {
    expect(isRefreshIntervalTitle('Something else')).toBe(false);
  });
});
