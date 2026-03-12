import { SecretListItem } from '~/app/types';

type MockSecretListItemOptions = {
  uuid?: string;
  name?: string;
  type?: string;
  data?: Record<string, string>;
  displayName?: string;
  description?: string;
};

export const mockSecretListItem = ({
  uuid = 'secret-uuid-123',
  name = 'test-secret',
  type,
  data = {
    // eslint-disable-next-line camelcase
    aws_access_key_id: '[REDACTED]',
    // eslint-disable-next-line camelcase
    aws_secret_access_key: '[REDACTED]',
    // eslint-disable-next-line camelcase
    aws_default_region: '[REDACTED]',
    // eslint-disable-next-line camelcase
    aws_s3_endpoint: '[REDACTED]',
  },
  displayName,
  description,
}: MockSecretListItemOptions = {}): SecretListItem => ({
  uuid,
  name,
  ...(type && { type }),
  data,
  ...(displayName && { displayName }),
  ...(description && { description }),
});

export const mockStorageSecret = (overrides: MockSecretListItemOptions = {}): SecretListItem =>
  mockSecretListItem({
    type: 's3',
    data: {
      // eslint-disable-next-line camelcase
      aws_access_key_id: '[REDACTED]',
      // eslint-disable-next-line camelcase
      aws_secret_access_key: '[REDACTED]',
      // eslint-disable-next-line camelcase
      aws_default_region: '[REDACTED]',
      // eslint-disable-next-line camelcase
      aws_s3_endpoint: '[REDACTED]',
    },
    ...overrides,
  });
