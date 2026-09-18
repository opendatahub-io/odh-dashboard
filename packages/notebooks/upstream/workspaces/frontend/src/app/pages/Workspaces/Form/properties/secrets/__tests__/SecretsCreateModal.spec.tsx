import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SecretsCreateModal } from '~/app/pages/Workspaces/Form/properties/secrets/SecretsCreateModal';
import { useNotebookAPI } from '~/app/hooks/useNotebookAPI';
import useSecret from '~/app/hooks/useSecret';
import { NotebookApis } from '~/shared/api/notebookApi';
import { SecretsSecretListItem } from '~/generated/data-contracts';

jest.mock('mod-arch-kubeflow', () => ({
  useThemeContext: () => ({ isMUITheme: false }),
}));
jest.mock('~/app/hooks/useNotebookAPI', () => ({
  useNotebookAPI: jest.fn(),
}));
jest.mock('~/app/hooks/useSecret', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseNotebookAPI = useNotebookAPI as jest.MockedFunction<typeof useNotebookAPI>;
const mockUseSecret = useSecret as jest.MockedFunction<typeof useSecret>;

const secretToEdit: SecretsSecretListItem = {
  name: 'db-credentials',
  canMount: true,
  canUpdate: true,
  audit: { createdAt: '', createdBy: '', updatedAt: '', updatedBy: '', deletedAt: '' },
};

describe('SecretsCreateModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSecret.mockReturnValue([
      { keyValuePairs: [], immutable: false, type: 'Opaque' },
      true,
      undefined,
      jest.fn(),
    ]);
  });

  it('creates the secret in the namespace passed by the workspace form, not a global namespace selector', async () => {
    const user = userEvent.setup();
    const createSecret = jest.fn().mockResolvedValue({});
    mockUseNotebookAPI.mockReturnValue({
      api: { secrets: { createSecret } } as unknown as NotebookApis,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });

    render(<SecretsCreateModal isOpen setIsOpen={jest.fn()} namespace="workspace-namespace" />);

    await user.type(screen.getByTestId('secret-name-input'), 'my-secret');
    await user.type(screen.getByTestId('key-input'), 'API_KEY');
    await user.type(screen.getByTestId('value-input'), 'super-secret-value');
    await user.click(screen.getByTestId('secret-modal-submit-button'));

    expect(createSecret).toHaveBeenCalledWith(
      'workspace-namespace',
      expect.objectContaining({ data: expect.objectContaining({ name: 'my-secret' }) }),
    );
  });

  it('fetches the secret to edit using the namespace passed by the workspace form', () => {
    mockUseNotebookAPI.mockReturnValue({
      api: {} as NotebookApis,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });

    render(
      <SecretsCreateModal
        isOpen
        setIsOpen={jest.fn()}
        namespace="workspace-namespace"
        secretToEdit={secretToEdit}
      />,
    );

    expect(useSecret).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'workspace-namespace', secretName: 'db-credentials' }),
    );
  });

  it('updates the secret in the namespace passed by the workspace form, not a global namespace selector', async () => {
    const user = userEvent.setup();
    const updateSecret = jest.fn().mockResolvedValue({});
    mockUseNotebookAPI.mockReturnValue({
      api: { secrets: { updateSecret } } as unknown as NotebookApis,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });
    mockUseSecret.mockReturnValue([
      {
        keyValuePairs: [{ key: 'API_KEY', value: 'old-value' }],
        immutable: false,
        type: 'Opaque',
      },
      true,
      undefined,
      jest.fn(),
    ]);

    render(
      <SecretsCreateModal
        isOpen
        setIsOpen={jest.fn()}
        namespace="workspace-namespace"
        secretToEdit={secretToEdit}
      />,
    );

    await user.click(screen.getByTestId('secret-modal-submit-button'));

    expect(updateSecret).toHaveBeenCalledWith(
      'workspace-namespace',
      'db-credentials',
      expect.objectContaining({ data: expect.any(Object) }),
    );
  });
});
