import { ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatTokenLimits } from '~/app/pages/subscriptions/viewSubscription/utils';

const Namespace = 'test-namespace';

const makeRef = (
  name: string,
  tokenRateLimits: ModelSubscriptionRef['tokenRateLimits'],
): ModelSubscriptionRef => ({
  name,
  namespace: Namespace,
  tokenRateLimits,
});

describe('formatTokenLimits', () => {
  it('returns "Unlimited" when the model is not found in the list', () => {
    const refs = [makeRef('model-a', [{ limit: 1000, window: '1h' }])];
    expect(formatTokenLimits(refs, Namespace, 'model-b')).toBe('Unlimited');
  });

  it('returns "Unlimited" when the model has an empty tokenRateLimits array', () => {
    const refs = [makeRef('model-a', [])];
    expect(formatTokenLimits(refs, Namespace, 'model-a')).toBe('Unlimited');
  });

  it('formats the first token rate limit correctly', () => {
    const refs = [makeRef('model-a', [{ limit: 5000, window: '1h' }])];
    expect(formatTokenLimits(refs, Namespace, 'model-a')).toBe('5,000 / 1h');
  });

  it('uses only the first limit when multiple rate limits are defined', () => {
    const refs = [
      makeRef('model-a', [
        { limit: 1000, window: '1m' },
        { limit: 50000, window: '1d' },
      ]),
    ];
    expect(formatTokenLimits(refs, Namespace, 'model-a')).toBe('1,000 / 1m');
  });

  it('returns "Unlimited" when the model has no tokenRateLimits field (undefined)', () => {
    const refs = [makeRef('model-a', undefined)];
    expect(formatTokenLimits(refs, Namespace, 'model-a')).toBe('Unlimited');
  });

  it('formats large limit numbers with locale separators', () => {
    const refs = [makeRef('model-a', [{ limit: 1_000_000, window: '24h' }])];
    expect(formatTokenLimits(refs, Namespace, 'model-a')).toBe('1,000,000 / 24h');
  });

  it('returns "Unlimited" when namespace does not match', () => {
    const refs = [makeRef('model-a', [{ limit: 1000, window: '1h' }])];
    expect(formatTokenLimits(refs, 'other-namespace', 'model-a')).toBe('Unlimited');
  });
});
