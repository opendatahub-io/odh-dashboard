import type { ConnectionTypeCredentialField } from '~/app/types';

export const SENSITIVE_CREDENTIAL_MASK = '••••••••';

const SENSITIVE_CREDENTIAL_FIELD_TERMS = [
  'password',
  'passphrase',
  'secret',
  'token',
  'credential',
  'credentials',
  'private',
  'uri',
  'url',
  'dsn',
] as const;

const SENSITIVE_CREDENTIAL_COMPOUND_TERMS = ['apikey', 'connectionstring'] as const;

const splitCredentialFieldCaseBoundaries = (value: string): string =>
  value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

const getCredentialFieldTokens = (value?: string | null): string[] =>
  splitCredentialFieldCaseBoundaries(value ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const getCredentialFieldNormalizedValue = (value?: string | null): string =>
  getCredentialFieldTokens(value).join('');

export const isSensitiveCredentialField = (
  field: Pick<ConnectionTypeCredentialField, 'name' | 'label'>,
): boolean => {
  const fieldTokens = [
    ...getCredentialFieldTokens(field.name),
    ...getCredentialFieldTokens(field.label),
  ];
  const normalizedValues = [
    getCredentialFieldNormalizedValue(field.name),
    getCredentialFieldNormalizedValue(field.label),
  ];

  return (
    fieldTokens.some((token) => SENSITIVE_CREDENTIAL_FIELD_TERMS.some((term) => token === term)) ||
    SENSITIVE_CREDENTIAL_COMPOUND_TERMS.some((term) =>
      normalizedValues.some((value) => value.includes(term)),
    )
  );
};
