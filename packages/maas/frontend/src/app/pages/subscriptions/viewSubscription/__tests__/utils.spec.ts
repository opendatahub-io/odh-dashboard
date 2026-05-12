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
  it('returns an empty array when the model is not found in the list', () => {
    const refs = [makeRef('model-a', [{ limit: 1000, window: '1h' }])];
    expect(formatTokenLimits(refs, Namespace, 'model-b')).toEqual([]);
  });

  it('returns an empty array when the model has an empty tokenRateLimits array', () => {
    const refs = [makeRef('model-a', [])];
    expect(formatTokenLimits(refs, Namespace, 'model-a')).toEqual([]);
  });

  it('formats a single token rate limit correctly', () => {
    const refs = [makeRef('model-a', [{ limit: 5000, window: '1h' }])];
    expect(formatTokenLimits(refs, Namespace, 'model-a')).toEqual(['5,000 / 1 hour']);
  });

  it('formats all rate limits when multiple are defined', () => {
    const refs = [
      makeRef('model-a', [
        { limit: 1000, window: '1m' },
        { limit: 50000, window: '1h' },
      ]),
    ];
    expect(formatTokenLimits(refs, Namespace, 'model-a')).toEqual([
      '1,000 / 1 minute',
      '50,000 / 1 hour',
    ]);
  });

  it('formats large limit numbers with locale separators', () => {
    const refs = [makeRef('model-a', [{ limit: 1_000_000, window: '24h' }])];
    expect(formatTokenLimits(refs, Namespace, 'model-a')).toEqual(['1,000,000 / 24 hours']);
  });

  it('returns an empty array when namespace does not match', () => {
    const refs = [makeRef('model-a', [{ limit: 1000, window: '1h' }])];
    expect(formatTokenLimits(refs, 'other-namespace', 'model-a')).toEqual([]);
  });
});
