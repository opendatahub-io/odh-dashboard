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
    ['SSH_KEY', 'SSH key'],
    ['SAS', 'SAS'],
    ['PASSCODE', 'Passcode'],
    ['AUTHORIZATION', 'Authorization'],
    ['URI', 'URI'],
    ['url', 'Connection URL'],
    ['CONNECTION_STRING', 'Connection string'],
    ['DSN', 'Data source name'],
    ['DATABASEURL', 'Endpoint'],
    ['clientSecret', 'clientSecret'],
    ['accessToken', 'accessToken'],
    ['dbPassword', 'dbPassword'],
    ['privateKey', 'privateKey'],
    ['dbpassword', 'dbpassword'],
    ['clientsecret', 'clientsecret'],
    ['accesstoken', 'accesstoken'],
    ['privatekey', 'privatekey'],
    ['PWD', 'PWD'],
    ['PASSWD', 'PASSWD'],
    ['DB_PWD', 'DB_PWD'],
    ['passwords', 'passwords'],
    ['secrets', 'secrets'],
    ['tokens', 'tokens'],
  ])('identifies sensitive field %s', (name, label) => {
    expect(isSensitiveCredentialField(field(name, label))).toBe(true);
  });

  it.each([
    ['HOST', 'Host'],
    ['SSL_MODE', 'SSL mode'],
    ['AWS_ACCESS_KEY_ID', 'Access key ID'],
  ])('does not identify non-sensitive field %s', (name, label) => {
    expect(isSensitiveCredentialField(field(name, label))).toBe(false);
  });

  it('conservatively identifies security protocol as sensitive until backend metadata exists', () => {
    expect(isSensitiveCredentialField(field('SECURITY_PROTOCOL', 'Security protocol'))).toBe(true);
  });

  it('uses the field label when the field name is generic', () => {
    expect(isSensitiveCredentialField(field('custom_field', 'API key'))).toBe(true);
  });
});
