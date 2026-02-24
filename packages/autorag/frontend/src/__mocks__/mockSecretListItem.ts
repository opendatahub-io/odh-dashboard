import { SecretListItem } from '~/app/types';

type MockSecretListItemOptions = {
  uuid?: string;
  name?: string;
  type?: string;
};

export const mockSecretListItem = ({
  uuid = 'secret-uuid-123',
  name = 'test-secret',
  type = 'storage',
}: MockSecretListItemOptions = {}): SecretListItem => ({
  uuid,
  name,
  type,
});

export const mockStorageSecret = (overrides: MockSecretListItemOptions = {}): SecretListItem =>
  mockSecretListItem({ type: 'storage', ...overrides });

export const mockLLSSecret = (overrides: MockSecretListItemOptions = {}): SecretListItem =>
  mockSecretListItem({ type: 'lls', ...overrides });
