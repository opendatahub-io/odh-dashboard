import { SecretListItem } from '~/app/types';

type MockSecretListItemOptions = {
  uuid?: string;
  name?: string;
  type?: 's3' | 'lls';
  availableKeys?: string[];
  displayName?: string;
  description?: string;
};

export const mockSecretListItem = ({
  uuid = 'secret-uuid-123',
  name = 'test-secret',
  type,
  availableKeys = [
    'aws_access_key_id',
    'aws_secret_access_key',
    'aws_default_region',
    'aws_s3_endpoint',
  ],
  displayName,
  description,
}: MockSecretListItemOptions = {}): SecretListItem => ({
  uuid,
  name,
  ...(type && { type }),
  availableKeys,
  ...(displayName && { displayName }),
  ...(description && { description }),
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

export const mockLLSSecret = (overrides: MockSecretListItemOptions = {}): SecretListItem =>
  mockSecretListItem({
    type: 'lls',
    availableKeys: ['llama_stack_client_api_key', 'llama_stack_client_base_url'],
    ...overrides,
  });
