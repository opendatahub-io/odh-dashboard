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
    AWS_ACCESS_KEY_ID: '[REDACTED]',
    AWS_SECRET_ACCESS_KEY: '[REDACTED]',
    AWS_DEFAULT_REGION: '[REDACTED]',
    AWS_S3_ENDPOINT: '[REDACTED]',
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
      AWS_ACCESS_KEY_ID: '[REDACTED]',
      AWS_SECRET_ACCESS_KEY: '[REDACTED]',
      AWS_DEFAULT_REGION: '[REDACTED]',
      AWS_S3_ENDPOINT: '[REDACTED]',
    },
    ...overrides,
  });
