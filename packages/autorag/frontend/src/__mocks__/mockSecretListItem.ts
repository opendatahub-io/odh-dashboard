import { SecretListItem } from '~/app/types';

type MockSecretListItemOptions = {
  uuid?: string;
  name?: string;
  type?: 's3' | 'lls' | '';
};

export const mockSecretListItem = ({
  uuid = 'secret-uuid-123',
  name = 'test-secret',
  type = 's3',
}: MockSecretListItemOptions = {}): SecretListItem => ({
  uuid,
  name,
  type,
});

export const mockStorageSecret = (overrides: MockSecretListItemOptions = {}): SecretListItem =>
  mockSecretListItem({ type: 's3', ...overrides });

export const mockLLSSecret = (overrides: MockSecretListItemOptions = {}): SecretListItem =>
  mockSecretListItem({ type: 'lls', ...overrides });
