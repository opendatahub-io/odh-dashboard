import {
  formatTokenLimits,
  formatTokenRateLimitLine,
  formatWindow,
} from '~/app/utilities/rateLimits';

describe('formatWindow', () => {
  it('formats window time values of 1000+ with locale separators', () => {
    expect(formatWindow('2000h')).toBe('2,000 hours');
  });

  it('formats human-readable window values of 1000+ with locale separators', () => {
    expect(formatWindow('2000 hours')).toBe('2,000 hours');
  });

  it('does not add separators for values below 1000', () => {
    expect(formatWindow('24h')).toBe('24 hours');
    expect(formatWindow('1h')).toBe('1 hour');
  });
});

describe('formatTokenRateLimitLine', () => {
  it('formats both limit and window time values with locale separators', () => {
    expect(formatTokenRateLimitLine(3000, '2000h')).toBe('3,000 / 2,000 hours');
    expect(formatTokenRateLimitLine(3000, '2000 hours')).toBe('3,000 / 2,000 hours');
  });
});

describe('formatTokenLimits', () => {
  it('formats both limit and window time values with locale separators', () => {
    expect(formatTokenLimits([{ limit: 3000, window: '2000h' }])).toBe('3,000 / 2,000 hours');
  });
});
