import { describe, expect, it } from '@jest/globals';
import { isSensitiveCredentialField } from '~/app/utilities/credentials';

const field = (name: string, label = name) => ({ name, label });

describe('isSensitiveCredentialField', () => {
  it.each([
    ['DB_PASSWORD', 'Database password'],
    ['SSH_PASSPHRASE', 'SSH passphrase'],
    ['AWS_SECRET_ACCESS_KEY', 'Secret key'],
    ['ACCESS_TOKEN', 'Access token'],
    ['CLIENT_CREDENTIALS', 'Client credentials'],
    ['API_KEY', 'API key'],
    ['PROVIDER_APIKEY', 'Provider API key'],
    ['PRIVATE_KEY', 'Private key'],
  ])('identifies sensitive field %s', (name, label) => {
    expect(isSensitiveCredentialField(field(name, label))).toBe(true);
  });

  it.each([
    ['URI', 'Connection URI'],
    ['HOST', 'Host'],
    ['SSL_MODE', 'SSL mode'],
    ['AWS_ACCESS_KEY_ID', 'Access key ID'],
  ])('does not identify non-sensitive field %s', (name, label) => {
    expect(isSensitiveCredentialField(field(name, label))).toBe(false);
  });

  it('uses the field label when the field name is generic', () => {
    expect(isSensitiveCredentialField(field('custom_field', 'API key'))).toBe(true);
  });
});
