import {
  configPairsToRecord,
  getSecretDisplayLabel,
  toCreateExternalProviderRequest,
} from '~/app/pages/external-providers/utils';
import {
  createExternalProviderFormSchema,
  getConfigPairsValidationError,
} from '~/app/pages/external-providers/validation';
import { EMPTY_CONFIG_PAIR } from '~/app/pages/external-providers/const';

describe('external provider form utils', () => {
  it('prefers secret displayName when present', () => {
    expect(getSecretDisplayLabel({ name: 'openai-api-key', displayName: 'OpenAI API key' })).toBe(
      'OpenAI API key',
    );
  });

  it('falls back to the Kubernetes resource name when displayName is absent', () => {
    expect(getSecretDisplayLabel({ name: 'openai-api-key' })).toBe('openai-api-key');
  });

  it('strips empty and incomplete config pairs', () => {
    expect(
      configPairsToRecord([
        { key: 'region', value: 'us-east-1' },
        { key: '  ', value: 'ignored' },
        { key: 'project', value: '' },
        { key: '', value: 'orphan' },
      ]),
    ).toEqual({ region: 'us-east-1' });
  });

  it('returns undefined when all config pairs are empty', () => {
    expect(configPairsToRecord([EMPTY_CONFIG_PAIR])).toBeUndefined();
  });

  it('maps form state to create request', () => {
    expect(
      toCreateExternalProviderRequest(
        'sample-a',
        {
          name: 'OpenAI Production',
          description: 'Prod endpoint',
          k8sName: {
            value: 'openai-prod',
            state: {
              immutable: false,
              invalidLength: false,
              invalidCharacters: false,
              maxLength: 253,
              routeNameTooLong: false,
              touched: false,
            },
          },
        },
        {
          provider: 'openai',
          endpointUrl: 'api.openai.com',
          authMechanism: 'apikey',
          credentialSecretRef: 'openai-api-key',
        },
        [{ key: 'region', value: 'us-east-1' }],
      ),
    ).toEqual({
      name: 'openai-prod',
      namespace: 'sample-a',
      displayName: 'OpenAI Production',
      description: 'Prod endpoint',
      endpointUrl: 'api.openai.com',
      authMechanism: 'apikey',
      credentialSecretRef: 'openai-api-key',
      provider: 'openai',
      config: { region: 'us-east-1' },
    });
  });
});

describe('getConfigPairsValidationError', () => {
  it('allows a fully empty pair row', () => {
    expect(getConfigPairsValidationError([{ key: '', value: '' }])).toBeUndefined();
  });

  it('rejects a pair with only a key or only a value', () => {
    expect(getConfigPairsValidationError([{ key: 'region', value: '' }])).toBe(
      'Each configuration pair must include both a key and a value',
    );
    expect(getConfigPairsValidationError([{ key: '', value: 'us-east-1' }])).toBe(
      'Each configuration pair must include both a key and a value',
    );
  });

  it('rejects keys that contain spaces', () => {
    expect(getConfigPairsValidationError([{ key: 'my key', value: 'value' }])).toBe(
      'Configuration keys cannot contain spaces',
    );
    expect(getConfigPairsValidationError([{ key: ' region', value: 'value' }])).toBe(
      'Configuration keys cannot contain spaces',
    );
  });
});

describe('createExternalProviderFormSchema', () => {
  const validBase = {
    provider: 'openai',
    endpointUrl: 'api.openai.com',
    authMechanism: 'apikey' as const,
    credentialSecretRef: 'openai-api-key',
    isNewSecret: false,
    secretValue: '',
  };

  it('accepts a valid existing-secret payload', () => {
    expect(createExternalProviderFormSchema.safeParse(validBase).success).toBe(true);
  });

  it('rejects endpoints with schemes', () => {
    expect(
      createExternalProviderFormSchema.safeParse({
        ...validBase,
        endpointUrl: 'https://api.openai.com',
      }).success,
    ).toBe(false);
  });

  it('requires secret value for new secrets', () => {
    const result = createExternalProviderFormSchema.safeParse({
      ...validBase,
      credentialSecretRef: 'new-secret',
      isNewSecret: true,
      secretValue: '',
    });
    expect(result.success).toBe(false);
  });
});
