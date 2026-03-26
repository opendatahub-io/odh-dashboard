import { ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatTokenLimits } from '../utils';

const makeRef = (
  name: string,
  tokenRateLimits: ModelSubscriptionRef['tokenRateLimits'],
): ModelSubscriptionRef => ({
  name,
  namespace: 'test-namespace',
  tokenRateLimits,
});

describe('formatTokenLimits', () => {
  it('returns "—" when the model is not found in the list', () => {
    const refs = [makeRef('model-a', [{ limit: 1000, window: '1h' }])];
    expect(formatTokenLimits(refs, 'model-b')).toBe('—');
  });

  it('returns "—" when the model has an empty tokenRateLimits array', () => {
    const refs = [makeRef('model-a', [])];
    expect(formatTokenLimits(refs, 'model-a')).toBe('—');
  });

  it('formats the first token rate limit correctly', () => {
    const refs = [makeRef('model-a', [{ limit: 5000, window: '1h' }])];
    expect(formatTokenLimits(refs, 'model-a')).toBe('5,000 / 1h');
  });

  it('uses only the first limit when multiple rate limits are defined', () => {
    const refs = [
      makeRef('model-a', [
        { limit: 1000, window: '1m' },
        { limit: 50000, window: '1d' },
      ]),
    ];
    expect(formatTokenLimits(refs, 'model-a')).toBe('1,000 / 1m');
  });

  it('returns "—" for an empty refs list', () => {
    expect(formatTokenLimits([], 'model-a')).toBe('—');
  });

  it('returns "—" when the model has no tokenRateLimits field (undefined)', () => {
    const refs = [makeRef('model-a', undefined)];
    expect(formatTokenLimits(refs, 'model-a')).toBe('—');
  });

  it('formats large limit numbers with locale separators', () => {
    const refs = [makeRef('model-a', [{ limit: 1_000_000, window: '24h' }])];
    expect(formatTokenLimits(refs, 'model-a')).toBe('1,000,000 / 24h');
  });
});
