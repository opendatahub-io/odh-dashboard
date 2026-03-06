import { SecretListItem } from '~/app/types';

type MockSecretListItemOptions = {
  uuid?: string;
  name?: string;
  type?: 's3' | '';
  availableKeys?: string[];
};

export const mockSecretListItem = ({
  uuid = 'secret-uuid-123',
  name = 'test-secret',
  type = 's3',
  availableKeys = [
    'aws_access_key_id',
    'aws_secret_access_key',
    'aws_default_region',
    'aws_s3_endpoint',
  ],
}: MockSecretListItemOptions = {}): SecretListItem => ({
  uuid,
  name,
  type,
  availableKeys,
});

export const mockStorageSecret = (overrides: MockSecretListItemOptions = {}): SecretListItem =>
  mockSecretListItem({
    type: 's3',
    availableKeys: [
      'aws_access_key_id',
      'aws_secret_access_key',
      'aws_default_region',
      'aws_s3_endpoint',
    ],
    ...overrides,
  });
