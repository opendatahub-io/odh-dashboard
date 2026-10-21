import {
  DATE_PICKER_MAX_DAYS,
  formatApiKeyError,
  formatDatePickerValue,
  formatExpirationLabel,
  getAfterDaysValidationMessage,
  getCalendarDaysBetween,
  DEFAULT_AFTER_DAYS,
  getDefaultExpirationDate,
  getExpirationModeLabel,
  getExpiresInFromDays,
  getMaxSelectableExpirationDate,
  getMinSelectableExpirationDate,
  startOfLocalDay,
  validateAfterDays,
  validateExpirationDate,
  getModelDocumentationUrl,
  ApiKeyUsageExampleKind,
  buildApiKeyUsageExample,
  findMaaSModelBySubscriptionRef,
  resolveApiKeyUsageExampleKind,
  getApiKeyUsageExampleEndpointPath,
} from '~/app/pages/keys-and-subs/utils';
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

describe('expiration helpers', () => {
  const from = new Date(2026, 0, 15); // Jan 15, 2026 local

  it('should label expiration modes', () => {
    expect(getExpirationModeLabel('max', 90)).toBe('Use max value of 90 days');
    expect(getExpirationModeLabel('onDate', 90)).toBe('On date');
    expect(getExpirationModeLabel('after', 90)).toBe('After');
  });

  it('should default after-days to tomorrow (1 day)', () => {
    expect(DEFAULT_AFTER_DAYS).toBe(1);
  });

  it('should default the on-date value to tomorrow', () => {
    expect(formatDatePickerValue(getDefaultExpirationDate(from))).toBe('2026-01-16');
  });

  it('should compute min and max selectable dates', () => {
    expect(formatDatePickerValue(getMinSelectableExpirationDate(from))).toBe('2026-01-16');
    expect(formatDatePickerValue(getMaxSelectableExpirationDate(90, from))).toBe('2026-04-15');
  });

  it('should cap the calendar max at DATE_PICKER_MAX_DAYS', () => {
    const maxDate = getMaxSelectableExpirationDate(Number.MAX_SAFE_INTEGER, from);
    expect(getCalendarDaysBetween(startOfLocalDay(from), maxDate)).toBe(DATE_PICKER_MAX_DAYS);
  });

  it('should validate on-date and after-days values', () => {
    expect(validateExpirationDate('2026-02-14', 90, from)).toBe('');
    expect(validateExpirationDate('2026-12-01', 90, from)).toBe(
      'Select a date between tomorrow (2026-01-16) and 2026-04-15',
    );
    expect(validateAfterDays('45', 90)).toBe('');
    expect(validateAfterDays('91', 90)).toBe(getAfterDaysValidationMessage(90));
    expect(validateAfterDays('999', 0)).toBe('');
    expect(validateAfterDays('0', 0)).toBe('Enter a value of at least 1 day');
    expect(validateExpirationDate('2026-01-16', 0, from)).toBe('');
  });

  it('should format expiresIn and success labels', () => {
    expect(getExpiresInFromDays(45)).toBe('45d');
    expect(formatExpirationLabel(90, 'max')).toBe('90 days (maximum)');
    expect(formatExpirationLabel(45, 'after')).toBe('45 days');
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

describe('getModelDocumentationUrl', () => {
  it('should return the correct URL', () => {
    expect(getModelDocumentationUrl('granite-3-8b', 'https://api.example.com/maas-api')).toBe(
      'https://api.example.com/v1/models/granite-3-8b/docs',
    );
  });
  it('should return undefined if the gateway URL is not valid', () => {
    expect(getModelDocumentationUrl('granite-3-8b', 'invalid-url')).toBeUndefined();
  });
});

describe('findMaaSModelBySubscriptionRef', () => {
  const models = [
    {
      id: 'publishers/maas-models/models/maas-model',
      // eslint-disable-next-line camelcase
      owned_by: 'maas-models/maas-model',
    },
    {
      id: 'publishers/maas-models/models/other-model',
      // eslint-disable-next-line camelcase
      owned_by: 'maas-models/other-model',
    },
    {
      id: 'granite-3-8b-instruct',
      // eslint-disable-next-line camelcase
      owned_by: 'ibm',
    },
    {
      id: 'publishers/llm/models/Qwen/Qwen2.5-0.5B-Instruct',
      // eslint-disable-next-line camelcase
      owned_by: 'llm/qwen2-5-0-5b-instruct',
      subscriptions: [{ name: 'qwen25-free-subscription' }],
    },
  ];

  it('should return an exact id match', () => {
    expect(findMaaSModelBySubscriptionRef(models, { refName: 'granite-3-8b-instruct' })?.id).toBe(
      'granite-3-8b-instruct',
    );
  });

  it('should resolve path-style catalog ids from the short subscription ref name', () => {
    expect(
      findMaaSModelBySubscriptionRef(models, {
        refName: 'maas-model',
        refNamespace: 'maas-models',
      })?.id,
    ).toBe('publishers/maas-models/models/maas-model');
  });

  it('should prefer catalog model_name over the short ref name', () => {
    expect(
      findMaaSModelBySubscriptionRef(models, {
        refName: 'qwen2-5-0-5b-instruct',
        catalogModelId: 'publishers/llm/models/Qwen/Qwen2.5-0.5B-Instruct',
      })?.id,
    ).toBe('publishers/llm/models/Qwen/Qwen2.5-0.5B-Instruct');
  });

  it('should resolve HF-style catalog ids via owned_by when last path segment differs', () => {
    expect(findMaaSModelBySubscriptionRef(models, { refName: 'qwen2-5-0-5b-instruct' })?.id).toBe(
      'publishers/llm/models/Qwen/Qwen2.5-0.5B-Instruct',
    );
  });

  it('should prefer exact owned_by namespace/name over another namespace with the same ref name', () => {
    const colliding = [
      {
        id: 'publishers/team-a/models/Qwen/Qwen-A',
        // eslint-disable-next-line camelcase
        owned_by: 'team-a/qwen',
      },
      {
        id: 'publishers/team-b/models/Qwen/Qwen-B',
        // eslint-disable-next-line camelcase
        owned_by: 'team-b/qwen',
      },
    ];
    expect(
      findMaaSModelBySubscriptionRef(colliding, {
        refName: 'qwen',
        refNamespace: 'team-b',
      })?.id,
    ).toBe('publishers/team-b/models/Qwen/Qwen-B');
  });

  it('should not resolve owned_by by short name alone when multiple namespaces match', () => {
    const colliding = [
      {
        id: 'publishers/team-a/models/Qwen/Qwen-A',
        // eslint-disable-next-line camelcase
        owned_by: 'team-a/qwen',
      },
      {
        id: 'publishers/team-b/models/Qwen/Qwen-B',
        // eslint-disable-next-line camelcase
        owned_by: 'team-b/qwen',
      },
    ];
    // No refNamespace and ambiguous owned_by short-name matches → leave unresolved
    // (last-segment fallback also does not uniquely identify either row).
    expect(findMaaSModelBySubscriptionRef(colliding, { refName: 'qwen' })).toBeUndefined();
  });

  it('should resolve via subscription entitlement when only one model is entitled', () => {
    expect(
      findMaaSModelBySubscriptionRef(models, {
        refName: 'unknown-ref',
        subscriptionId: 'qwen25-free-subscription',
      })?.id,
    ).toBe('publishers/llm/models/Qwen/Qwen2.5-0.5B-Instruct');
  });

  it('should fall back to matching the last path segment', () => {
    expect(findMaaSModelBySubscriptionRef(models, { refName: 'other-model' })?.id).toBe(
      'publishers/maas-models/models/other-model',
    );
  });

  it('should return undefined when no model matches', () => {
    expect(findMaaSModelBySubscriptionRef(models, { refName: 'missing-model' })).toBeUndefined();
  });
});

describe('resolveApiKeyUsageExampleKind', () => {
  it('should resolve embedding from model capabilities', () => {
    expect(resolveApiKeyUsageExampleKind(['text-embedding'])).toBe(
      ApiKeyUsageExampleKind.Embedding,
    );
    expect(resolveApiKeyUsageExampleKind(['embeddings'])).toBe(ApiKeyUsageExampleKind.Embedding);
    expect(resolveApiKeyUsageExampleKind(['embedding'])).toBe(ApiKeyUsageExampleKind.Embedding);
  });

  it('should resolve transcription for ASR-only capabilities', () => {
    expect(resolveApiKeyUsageExampleKind(['audio-transcription'])).toBe(
      ApiKeyUsageExampleKind.Transcription,
    );
    expect(resolveApiKeyUsageExampleKind(['audio-transcription', 'vision'])).toBe(
      ApiKeyUsageExampleKind.Transcription,
    );
  });

  it('should default to chat for text-generation and multimodal ASR', () => {
    expect(resolveApiKeyUsageExampleKind(['text-generation'])).toBe(ApiKeyUsageExampleKind.Chat);
    expect(resolveApiKeyUsageExampleKind(['text-generation', 'audio-transcription'])).toBe(
      ApiKeyUsageExampleKind.Chat,
    );
    expect(resolveApiKeyUsageExampleKind()).toBe(ApiKeyUsageExampleKind.Chat);
  });
});

describe('buildApiKeyUsageExample', () => {
  it('should build an embeddings curl example', () => {
    const example = buildApiKeyUsageExample(
      'https://maas.apps.example.com',
      'embed-model',
      'sk-test-key',
      ApiKeyUsageExampleKind.Embedding,
    );
    expect(example).toContain('/v1/embeddings');
    expect(example).toContain('"input":"Hello"');
    expect(example).not.toContain('messages');
    expect(getApiKeyUsageExampleEndpointPath(ApiKeyUsageExampleKind.Embedding)).toBe(
      '/v1/embeddings',
    );
  });

  it('should build a transcription curl example', () => {
    const example = buildApiKeyUsageExample(
      'https://maas.apps.example.com',
      'asr-model',
      'sk-test-key',
      ApiKeyUsageExampleKind.Transcription,
    );
    expect(example).toContain('/v1/audio/transcriptions');
    expect(example).toContain('-F "file=@<path-to-audio-file>"');
    expect(example).toContain('-F "model=asr-model"');
    expect(example).not.toContain('Content-Type: application/json');
    expect(getApiKeyUsageExampleEndpointPath(ApiKeyUsageExampleKind.Transcription)).toBe(
      '/v1/audio/transcriptions',
    );
  });

  it('should not duplicate /v1 when the base URL already ends with it', () => {
    const example = buildApiKeyUsageExample(
      'https://maas.apps.example.com/v1',
      'chat-model',
      'sk-test-key',
    );
    expect(example).toContain('curl -X POST https://maas.apps.example.com/v1/chat/completions');
    expect(example).not.toContain('/v1/v1/');
  });

  it('should return empty string for invalid or incomplete inputs', () => {
    expect(buildApiKeyUsageExample('ftp://api.example.com', 'chat-model', 'sk-test-key')).toBe('');
    expect(buildApiKeyUsageExample(undefined, 'chat-model', 'sk-test-key')).toBe('');
    expect(buildApiKeyUsageExample('https://api.example.com', '', 'sk-test-key')).toBe('');
  });
});
