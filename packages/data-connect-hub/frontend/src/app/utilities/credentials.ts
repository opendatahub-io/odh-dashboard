import type { ConnectionTypeCredentialField } from '~/app/types';

export const SENSITIVE_CREDENTIAL_MASK = '••••••••';

const SENSITIVE_CREDENTIAL_FIELD_TERMS = [
  'password',
  'passphrase',
  'secret',
  'token',
  'credential',
  'apikey',
  'private',
] as const;

const normalizeCredentialFieldName = (value?: string | null): string =>
  (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const isSensitiveCredentialField = (
  field: Pick<ConnectionTypeCredentialField, 'name' | 'label'>,
): boolean => {
  const fieldName = normalizeCredentialFieldName(field.name);
  const fieldLabel = normalizeCredentialFieldName(field.label);

  return SENSITIVE_CREDENTIAL_FIELD_TERMS.some(
    (term) => fieldName.includes(term) || fieldLabel.includes(term),
  );
};
