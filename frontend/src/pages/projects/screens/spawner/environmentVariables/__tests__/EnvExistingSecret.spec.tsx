import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { SecretCategory } from '#~/pages/projects/types';
import EnvExistingSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecret';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
  k8sListResource: jest.fn(),
}));

jest.mock('#~/utilities/utils', () => ({
  getDashboardMainContainer: jest.fn(() => undefined),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource<SecretKind>);
const k8sListResourceMock = jest.mocked(k8sListResource<SecretKind>);

const mockSecret = (name: string, keys: string[]): SecretKind => {
  const data: Record<string, string> = {};
  keys.forEach((key) => {
    data[key] = btoa(`value-for-${key}`);
  });
  return mockCustomSecretK8sResource({
    name,
    namespace: 'test-ns',
    data,
    type: 'Opaque',
  });
};

const openTypeaheadDropdown = () => {
  const toggle = screen.getByTestId('existing-secret-typeahead');
  const combobox = within(toggle).getByRole('combobox');
  fireEvent.click(combobox);
};

describe('EnvExistingSecret', () => {
  const mockOnUpdate = jest.fn();
  const mockOnSecretNameChange = jest.fn();
  const defaultProps = {
    namespace: 'test-ns',
    onUpdate: mockOnUpdate,
    onSecretNameChange: mockOnSecretNameChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    k8sListResourceMock.mockResolvedValue({
      items: [
        mockSecret('db-credentials', ['username', 'password', 'host']),
        mockSecret('api-keys', ['primary', 'secondary']),
      ],
    } as never);
  });

  it('should render the secret selector dropdown', async () => {
    render(<EnvExistingSecret {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-selector')).toBeInTheDocument();
    });
  });

  it('should show available secrets in the dropdown', async () => {
    render(<EnvExistingSecret {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-typeahead')).toBeInTheDocument();
    });

    openTypeaheadDropdown();

    await waitFor(() => {
      expect(screen.getByText('db-credentials')).toBeInTheDocument();
      expect(screen.getByText('api-keys')).toBeInTheDocument();
    });
  });

  it('should show key picker after selecting a secret', async () => {
    k8sGetResourceMock.mockResolvedValue(
      mockSecret('db-credentials', ['username', 'password', 'host']),
    );

    render(<EnvExistingSecret {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-typeahead')).toBeInTheDocument();
    });

    openTypeaheadDropdown();

    await waitFor(() => {
      expect(screen.getByText('db-credentials')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('db-credentials'));

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-key-picker')).toBeInTheDocument();
    });

    expect(screen.getByTestId('key-checkbox-username')).toBeInTheDocument();
    expect(screen.getByTestId('key-checkbox-password')).toBeInTheDocument();
    expect(screen.getByTestId('key-checkbox-host')).toBeInTheDocument();
  });

  it('should show "All keys" checkbox in the key picker', async () => {
    k8sGetResourceMock.mockResolvedValue(mockSecret('db-credentials', ['username', 'password']));

    render(<EnvExistingSecret {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-typeahead')).toBeInTheDocument();
    });

    openTypeaheadDropdown();
    await waitFor(() => {
      expect(screen.getByText('db-credentials')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('db-credentials'));

    await waitFor(() => {
      expect(screen.getByTestId('all-keys-checkbox')).toBeInTheDocument();
    });
  });

  it('should select all keys when "All keys" is checked', async () => {
    k8sGetResourceMock.mockResolvedValue(mockSecret('db-credentials', ['username', 'password']));

    render(<EnvExistingSecret {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-typeahead')).toBeInTheDocument();
    });

    openTypeaheadDropdown();
    await waitFor(() => {
      expect(screen.getByText('db-credentials')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('db-credentials'));

    await waitFor(() => {
      expect(screen.getByTestId('all-keys-checkbox')).toBeInTheDocument();
    });

    // PF v6 Checkbox places data-testid directly on the input element
    fireEvent.click(screen.getByTestId('all-keys-checkbox'));

    expect(mockOnUpdate).toHaveBeenCalledWith({
      category: SecretCategory.EXISTING,
      data: [
        { key: 'username', value: '' },
        { key: 'password', value: '' },
      ],
    });
  });

  it('should select individual keys', async () => {
    k8sGetResourceMock.mockResolvedValue(
      mockSecret('db-credentials', ['username', 'password', 'host']),
    );

    render(<EnvExistingSecret {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-typeahead')).toBeInTheDocument();
    });

    openTypeaheadDropdown();
    await waitFor(() => {
      expect(screen.getByText('db-credentials')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('db-credentials'));

    await waitFor(() => {
      expect(screen.getByTestId('key-checkbox-username')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('key-checkbox-username'));

    expect(mockOnUpdate).toHaveBeenCalledWith({
      category: SecretCategory.EXISTING,
      data: [{ key: 'username', value: '' }],
    });
  });

  it('should restore selected state from existing env data', async () => {
    k8sGetResourceMock.mockResolvedValue(
      mockSecret('db-credentials', ['username', 'password', 'host']),
    );

    render(
      <EnvExistingSecret
        {...defaultProps}
        selectedSecretName="db-credentials"
        env={{
          category: SecretCategory.EXISTING,
          data: [
            { key: 'username', value: '' },
            { key: 'host', value: '' },
          ],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-key-picker')).toBeInTheDocument();
    });

    // PF v6 Checkbox data-testid is on the input element directly
    expect(screen.getByTestId('key-checkbox-username')).toBeChecked();
    expect(screen.getByTestId('key-checkbox-host')).toBeChecked();
    expect(screen.getByTestId('key-checkbox-password')).not.toBeChecked();
  });

  it('should not render secret values', async () => {
    k8sGetResourceMock.mockResolvedValue(mockSecret('db-credentials', ['username', 'password']));

    render(<EnvExistingSecret {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-typeahead')).toBeInTheDocument();
    });

    openTypeaheadDropdown();
    await waitFor(() => {
      expect(screen.getByText('db-credentials')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('db-credentials'));

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-key-picker')).toBeInTheDocument();
    });

    // Ensure no secret values appear in the rendered output
    expect(screen.queryByText('value-for-username')).not.toBeInTheDocument();
    expect(screen.queryByText('value-for-password')).not.toBeInTheDocument();
    expect(screen.queryByText(btoa('value-for-username'))).not.toBeInTheDocument();
    expect(screen.queryByText(btoa('value-for-password'))).not.toBeInTheDocument();
  });

  it('should uncheck "All keys" when an individual key is deselected', async () => {
    k8sGetResourceMock.mockResolvedValue(mockSecret('db-credentials', ['username', 'password']));

    render(
      <EnvExistingSecret
        {...defaultProps}
        selectedSecretName="db-credentials"
        env={{
          category: SecretCategory.EXISTING,
          data: [
            { key: 'username', value: '' },
            { key: 'password', value: '' },
          ],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('all-keys-checkbox')).toBeInTheDocument();
    });

    // All keys checkbox should be checked since all keys are selected
    expect(screen.getByTestId('all-keys-checkbox')).toBeChecked();

    // Deselect "password"
    fireEvent.click(screen.getByTestId('key-checkbox-password'));

    expect(mockOnUpdate).toHaveBeenCalledWith({
      category: SecretCategory.EXISTING,
      data: [{ key: 'username', value: '' }],
    });
  });

  it('should handle empty keys in secret gracefully', async () => {
    k8sGetResourceMock.mockResolvedValue(
      mockCustomSecretK8sResource({
        name: 'empty-secret',
        namespace: 'test-ns',
        data: {},
        type: 'Opaque',
      }),
    );

    k8sListResourceMock.mockResolvedValue({
      items: [
        mockCustomSecretK8sResource({
          name: 'empty-secret',
          namespace: 'test-ns',
          data: {},
          type: 'Opaque',
        }),
      ],
    } as never);

    render(<EnvExistingSecret {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-typeahead')).toBeInTheDocument();
    });

    openTypeaheadDropdown();
    await waitFor(() => {
      expect(screen.getByText('empty-secret')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('empty-secret'));

    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-key-picker')).toBeInTheDocument();
    });

    // No key checkboxes or "All keys" when secret has no keys
    expect(screen.queryByTestId('all-keys-checkbox')).not.toBeInTheDocument();
  });
});
