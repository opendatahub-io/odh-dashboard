import { formatApiKeyError } from '~/app/pages/keys-and-subs/utils';
import { deriveModelGroups } from '~/app/pages/keys-and-subs/mySubscriptions/SubscriptionsTab';

describe('formatApiKeyError', () => {
  describe('max expiration errors', () => {
    it('should format the upstream expiration error with the max days extracted', () => {
      expect(
        formatApiKeyError('requested expiration (8760h0m0s) exceeds maximum allowed (90 days)'),
      ).toBe(
        'Requested expiration exceeds maximum allowed (90 days). Select a shorter duration and try again.',
      );
    });

    it('should reflect different max day values in the formatted message', () => {
      expect(
        formatApiKeyError('requested expiration (720h0m0s) exceeds maximum allowed (30 days)'),
      ).toBe(
        'Requested expiration exceeds maximum allowed (30 days). Select a shorter duration and try again.',
      );
    });
  });

  describe('fallback capitalization', () => {
    it('should capitalize the first letter of an unrecognized error message', () => {
      expect(formatApiKeyError('something went wrong')).toBe('Something went wrong');
    });

    it('should not modify a message that is already capitalized', () => {
      expect(formatApiKeyError('Name is required')).toBe('Name is required');
    });

    it('should return the message unchanged if it starts with a non-letter character', () => {
      expect(formatApiKeyError('400: bad request')).toBe('400: bad request');
    });
  });

  describe('edge cases', () => {
    it('should return an empty string unchanged', () => {
      expect(formatApiKeyError('')).toBe('');
    });

    it('should capitalize a single character string', () => {
      expect(formatApiKeyError('x')).toBe('X');
    });
  });
});

describe('deriveModelGroups', () => {
  /* eslint-disable camelcase */
  const mockSubscriptions = [
    {
      subscription_id_header: 'sub-1',
      subscription_description: 'First subscription',
      display_name: 'Subscription One',
      priority: 1,
      key_count: 2,
      model_refs: [
        {
          name: 'granite-3-8b',
          display_name: 'Granite 3 8B',
          source: 'internal',
          description: 'A granite model',
          token_rate_limits: [{ limit: 1000, window: '1h' }],
        },
        {
          name: 'llama-3',
          display_name: 'Llama 3',
          source: 'external',
          token_rate_limits: [{ limit: 500, window: '1m' }],
        },
      ],
    },
    {
      subscription_id_header: 'sub-2',
      subscription_description: 'Second subscription',
      display_name: 'Subscription Two',
      priority: 2,
      key_count: 1,
      model_refs: [
        {
          name: 'granite-3-8b',
          display_name: 'Granite 3 8B',
          source: 'internal',
          description: 'A granite model',
          token_rate_limits: [{ limit: 2000, window: '1d' }],
        },
      ],
    },
  ];
  /* eslint-enable camelcase */

  it('should group subscriptions by model name', () => {
    const groups = deriveModelGroups(mockSubscriptions);
    expect(groups).toHaveLength(2);
  });

  it('should aggregate subscriptions under the same model', () => {
    const groups = deriveModelGroups(mockSubscriptions);
    const graniteGroup = groups.find((g) => g.name === 'granite-3-8b');
    expect(graniteGroup?.subscriptions).toHaveLength(2);
  });

  it('should populate model metadata from the first occurrence', () => {
    const groups = deriveModelGroups(mockSubscriptions);
    const graniteGroup = groups.find((g) => g.name === 'granite-3-8b');
    expect(graniteGroup?.displayName).toBe('Granite 3 8B');
    expect(graniteGroup?.source).toBe('internal');
    expect(graniteGroup?.description).toBe('A granite model');
  });

  it('should map subscription fields to camelCase properties', () => {
    const groups = deriveModelGroups(mockSubscriptions);
    const llamaGroup = groups.find((g) => g.name === 'llama-3');
    expect(llamaGroup?.subscriptions[0]).toEqual({
      subscriptionIdHeader: 'sub-1',
      displayName: 'Subscription One',
      keyCount: 2,
      tokenRateLimits: [{ limit: 500, window: '1m' }],
    });
  });

  it('should return an empty array when given no subscriptions', () => {
    expect(deriveModelGroups([])).toEqual([]);
  });
});
