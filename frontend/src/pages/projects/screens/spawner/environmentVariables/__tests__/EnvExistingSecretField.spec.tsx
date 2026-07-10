import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecretKind } from '@odh-dashboard/k8s-core';
import { SecretCategory } from '#~/pages/projects/types';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';
import EnvExistingSecretField from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecretField';

// Mock the useExistingSecrets hook
jest.mock('#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets', () => ({
  useExistingSecrets: jest.fn(),
}));

const mockUseExistingSecrets = useExistingSecrets as jest.MockedFunction<typeof useExistingSecrets>;

describe('EnvExistingSecretField', () => {
  const mockOnUpdate = jest.fn();
  const mockOnSecretSelect = jest.fn();
  const namespace = 'test-namespace';

  const mockSecrets: SecretKind[] = [
    {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'secret-1',
        namespace: 'test-namespace',
      },
      type: 'Opaque',
      data: {
        username: 'dXNlcm5hbWU=', // base64 encoded 'username'
        password: 'cGFzc3dvcmQ=', // base64 encoded 'password'
        'api-key': 'YXBpLWtleQ==', // base64 encoded 'api-key'
      },
    },
    {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'secret-2',
        namespace: 'test-namespace',
      },
      type: 'Opaque',
      data: {
        token: 'dG9rZW4=', // base64 encoded 'token'
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state when secrets are being fetched', () => {
    mockUseExistingSecrets.mockReturnValue([[], false, undefined, jest.fn()]);

    render(
      <EnvExistingSecretField
        env={{ category: SecretCategory.EXISTING, data: [] }}
        namespace={namespace}
        onUpdate={mockOnUpdate}
        onSecretSelect={mockOnSecretSelect}
      />,
    );

    expect(screen.getByText('Loading secrets...')).toBeInTheDocument();
  });

  it('should render secret dropdown with secret names', async () => {
    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);

    render(
      <EnvExistingSecretField
        env={{ category: SecretCategory.EXISTING, data: [] }}
        namespace={namespace}
        onUpdate={mockOnUpdate}
        onSecretSelect={mockOnSecretSelect}
      />,
    );

    const dropdown = screen.getByTestId('existing-secret-select');
    expect(dropdown).toBeInTheDocument();

    // Click on the input to open the dropdown
    const input = screen.getByRole('combobox');
    fireEvent.click(input);

    // Wait for the dropdown to open and show options
    await waitFor(() => {
      expect(screen.getByText('secret-1')).toBeInTheDocument();
    });

    expect(screen.getByText('secret-2')).toBeInTheDocument();

    // Should never show secret values
    expect(screen.queryByText('username')).not.toBeInTheDocument();
    expect(screen.queryByText('password')).not.toBeInTheDocument();
    expect(screen.queryByText('token')).not.toBeInTheDocument();
  });

  it('should show key checkboxes after selecting a secret', () => {
    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);

    render(
      <EnvExistingSecretField
        env={{ category: SecretCategory.EXISTING, data: [] }}
        existingName="secret-1"
        namespace={namespace}
        onUpdate={mockOnUpdate}
        onSecretSelect={mockOnSecretSelect}
      />,
    );

    // Should show checkboxes for secret keys
    expect(screen.getByTestId('existing-secret-key-username')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-key-password')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-key-api-key')).toBeInTheDocument();

    // Should show "All keys" toggle
    expect(screen.getByTestId('existing-secret-all-keys')).toBeInTheDocument();
  });

  it('should call onSecretSelect and onUpdate when a secret is selected', async () => {
    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);

    render(
      <EnvExistingSecretField
        env={{ category: SecretCategory.EXISTING, data: [] }}
        namespace={namespace}
        onUpdate={mockOnUpdate}
        onSecretSelect={mockOnSecretSelect}
      />,
    );

    // Click on the input to open the dropdown
    const input = screen.getByRole('combobox');
    fireEvent.click(input);

    // Wait for the dropdown to open and show options
    const secret1Option = await screen.findByText('secret-1');
    fireEvent.click(secret1Option);

    expect(mockOnSecretSelect).toHaveBeenCalledWith('secret-1');
    expect(mockOnUpdate).toHaveBeenCalledWith({
      category: SecretCategory.EXISTING,
      data: [],
    });
  });

  it('should call onUpdate when individual keys are selected', () => {
    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);

    const { rerender } = render(
      <EnvExistingSecretField
        env={{ category: SecretCategory.EXISTING, data: [] }}
        existingName="secret-1"
        namespace={namespace}
        onUpdate={mockOnUpdate}
        onSecretSelect={mockOnSecretSelect}
      />,
    );

    // Select username key
    const usernameCheckbox = screen.getByTestId('existing-secret-key-username');
    fireEvent.click(usernameCheckbox);

    expect(mockOnUpdate).toHaveBeenLastCalledWith({
      category: SecretCategory.EXISTING,
      data: [{ key: 'username', value: '' }],
    });

    // Re-render with the updated state (simulating parent component update)
    rerender(
      <EnvExistingSecretField
        env={{
          category: SecretCategory.EXISTING,
          data: [{ key: 'username', value: '' }],
        }}
        existingName="secret-1"
        namespace={namespace}
        onUpdate={mockOnUpdate}
        onSecretSelect={mockOnSecretSelect}
      />,
    );

    // Now select password key (in addition to username)
    const passwordCheckbox = screen.getByTestId('existing-secret-key-password');
    fireEvent.click(passwordCheckbox);

    expect(mockOnUpdate).toHaveBeenLastCalledWith({
      category: SecretCategory.EXISTING,
      data: [
        { key: 'username', value: '' },
        { key: 'password', value: '' },
      ],
    });
  });

  it('should handle "All keys" toggle correctly', () => {
    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);

    render(
      <EnvExistingSecretField
        env={{ category: SecretCategory.EXISTING, data: [] }}
        existingName="secret-1"
        namespace={namespace}
        onUpdate={mockOnUpdate}
        onSecretSelect={mockOnSecretSelect}
      />,
    );

    // Click "All keys" toggle
    const allKeysToggle = screen.getByTestId('existing-secret-all-keys');
    fireEvent.click(allKeysToggle);

    expect(mockOnUpdate).toHaveBeenCalledWith({
      category: SecretCategory.EXISTING,
      data: [
        { key: 'api-key', value: '' },
        { key: 'password', value: '' },
        { key: 'username', value: '' },
      ],
    });
  });

  it('should handle deselecting all keys with "All keys" toggle', () => {
    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);

    render(
      <EnvExistingSecretField
        env={{
          category: SecretCategory.EXISTING,
          data: [
            { key: 'username', value: '' },
            { key: 'password', value: '' },
            { key: 'api-key', value: '' },
          ],
        }}
        existingName="secret-1"
        namespace={namespace}
        onUpdate={mockOnUpdate}
        onSecretSelect={mockOnSecretSelect}
      />,
    );

    // Click "All keys" toggle to deselect all
    const allKeysToggle = screen.getByTestId('existing-secret-all-keys');
    fireEvent.click(allKeysToggle);

    expect(mockOnUpdate).toHaveBeenCalledWith({
      category: SecretCategory.EXISTING,
      data: [],
    });
  });

  it('should show error message when secrets fail to load', () => {
    const error = new Error('Failed to load secrets');
    mockUseExistingSecrets.mockReturnValue([[], false, error, jest.fn()]);

    render(
      <EnvExistingSecretField
        env={{ category: SecretCategory.EXISTING, data: [] }}
        namespace={namespace}
        onUpdate={mockOnUpdate}
        onSecretSelect={mockOnSecretSelect}
      />,
    );

    expect(screen.getByText('Error loading secrets: Failed to load secrets')).toBeInTheDocument();
  });

  it('should show message when no secrets are available', async () => {
    mockUseExistingSecrets.mockReturnValue([[], true, undefined, jest.fn()]);

    render(
      <EnvExistingSecretField
        env={{ category: SecretCategory.EXISTING, data: [] }}
        namespace={namespace}
        onUpdate={mockOnUpdate}
        onSecretSelect={mockOnSecretSelect}
      />,
    );

    // Click on the input to open the dropdown
    const input = screen.getByRole('combobox');
    fireEvent.click(input);

    // Wait for the dropdown to open and show "no options" message
    await waitFor(() => {
      expect(screen.getByText('No secrets are available')).toBeInTheDocument();
    });
  });
});