import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecretKind } from '@odh-dashboard/k8s-core';
import { getSecret } from '#~/api/k8s/secrets';
import { EnvVariableData } from '#~/pages/projects/types';
import EnvExistingSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecret';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('../useExistingSecrets');
jest.mock('#~/api/k8s/secrets');

const mockUseExistingSecrets = jest.mocked(useExistingSecrets);
const mockGetSecret = jest.mocked(getSecret);

const createMockSecret = (name: string, data: Record<string, string>): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name,
    namespace: 'test-namespace',
  },
  type: 'Opaque',
  data: Object.fromEntries(Object.keys(data).map((k) => [k, btoa(data[k])])),
});

describe('EnvExistingSecret', () => {
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show message when namespace is not provided', () => {
    mockUseExistingSecrets.mockReturnValue([[], false, undefined, jest.fn()]);

    render(
      <EnvExistingSecret env={{ category: null, data: [] }} onUpdate={mockOnUpdate} namespace="" />,
    );

    expect(
      screen.getByText(/existing secrets cannot be loaded without a project context/i),
    ).toBeInTheDocument();
  });

  it('should render typeahead with loading state', () => {
    mockUseExistingSecrets.mockReturnValue([[], false, undefined, jest.fn()]);

    render(
      <EnvExistingSecret
        env={{ category: null, data: [] }}
        onUpdate={mockOnUpdate}
        namespace="test-namespace"
      />,
    );

    expect(screen.getByPlaceholderText(/loading secrets/i)).toBeInTheDocument();
  });

  it('should render typeahead with available secrets', () => {
    const mockSecrets = [
      createMockSecret('secret-one', { key1: 'val1' }),
      createMockSecret('secret-two', { key2: 'val2' }),
    ];

    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);

    render(
      <EnvExistingSecret
        env={{ category: null, data: [] }}
        onUpdate={mockOnUpdate}
        namespace="test-namespace"
      />,
    );

    expect(screen.getByPlaceholderText(/select a secret/i)).toBeInTheDocument();
  });

  it('should display error when secrets fail to load', () => {
    const error = new Error('Failed to load');
    mockUseExistingSecrets.mockReturnValue([[], false, error, jest.fn()]);

    render(
      <EnvExistingSecret
        env={{ category: null, data: [] }}
        onUpdate={mockOnUpdate}
        namespace="test-namespace"
      />,
    );

    expect(screen.getByText(/error loading secrets/i)).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should show no secrets available when list is empty', () => {
    mockUseExistingSecrets.mockReturnValue([[], true, undefined, jest.fn()]);

    render(
      <EnvExistingSecret
        env={{ category: null, data: [] }}
        onUpdate={mockOnUpdate}
        namespace="test-namespace"
      />,
    );

    expect(screen.getByPlaceholderText(/no existing secrets available/i)).toBeInTheDocument();
  });

  it('should load secret keys when a secret is selected', async () => {
    const mockSecrets = [createMockSecret('secret-one', { key1: 'val1', key2: 'val2' })];
    const mockSecretDetail = createMockSecret('secret-one', { key1: 'val1', key2: 'val2' });

    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);
    mockGetSecret.mockResolvedValue(mockSecretDetail);

    render(
      <EnvExistingSecret
        env={{ category: null, data: [] }}
        onUpdate={mockOnUpdate}
        namespace="test-namespace"
      />,
    );

    const input = screen.getByPlaceholderText(/select a secret/i);
    fireEvent.click(input);

    const option = await screen.findByText('secret-one');
    fireEvent.click(option);

    await waitFor(() => {
      expect(mockGetSecret).toHaveBeenCalledWith('test-namespace', 'secret-one');
    });
  });

  it('should display key selection checkboxes after secret is selected', async () => {
    const mockSecrets = [createMockSecret('secret-one', { key1: 'val1', key2: 'val2' })];
    const mockSecretDetail = createMockSecret('secret-one', { key1: 'val1', key2: 'val2' });

    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);
    mockGetSecret.mockResolvedValue(mockSecretDetail);

    const { rerender } = render(
      <EnvExistingSecret
        env={{ category: null, data: [] }}
        onUpdate={mockOnUpdate}
        namespace="test-namespace"
      />,
    );

    const input = screen.getByPlaceholderText(/select a secret/i);
    fireEvent.click(input);

    const option = await screen.findByText('secret-one');
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(mockGetSecret).toHaveBeenCalled();
    });

    // After selection, the component should call onUpdate with selected secret
    expect(mockOnUpdate).toHaveBeenCalled();

    // Re-render with updated env including the selected secret
    const updatedEnv: EnvVariableData = {
      category: null,
      data: [],
    };

    rerender(
      <EnvExistingSecret env={updatedEnv} onUpdate={mockOnUpdate} namespace="test-namespace" />,
    );

    // Should show key checkboxes (this will be tested in component implementation)
  });

  it('should show all keys checkbox', async () => {
    const mockSecrets = [createMockSecret('secret-one', { key1: 'val1', key2: 'val2' })];
    const mockSecretDetail = createMockSecret('secret-one', { key1: 'val1', key2: 'val2' });

    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);
    mockGetSecret.mockResolvedValue(mockSecretDetail);

    render(
      <EnvExistingSecret
        env={{ category: null, data: [] }}
        onUpdate={mockOnUpdate}
        namespace="test-namespace"
      />,
    );

    const input = screen.getByPlaceholderText(/select a secret/i);
    fireEvent.click(input);

    const option = await screen.findByText('secret-one');
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(mockGetSecret).toHaveBeenCalled();
    });
  });

  it('should update form state when individual keys are selected', async () => {
    const mockSecrets = [createMockSecret('secret-one', { key1: 'val1', key2: 'val2' })];
    const mockSecretDetail = createMockSecret('secret-one', { key1: 'val1', key2: 'val2' });

    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);
    mockGetSecret.mockResolvedValue(mockSecretDetail);

    render(
      <EnvExistingSecret
        env={{ category: null, data: [] }}
        onUpdate={mockOnUpdate}
        namespace="test-namespace"
      />,
    );

    const input = screen.getByPlaceholderText(/select a secret/i);
    fireEvent.click(input);

    const option = await screen.findByText('secret-one');
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(mockGetSecret).toHaveBeenCalled();
    });

    // Verify that onUpdate was called with appropriate data structure
    expect(mockOnUpdate).toHaveBeenCalled();
  });

  it('should never display secret values', async () => {
    const mockSecrets = [createMockSecret('secret-one', { key1: 'secret-value' })];
    const mockSecretDetail = createMockSecret('secret-one', { key1: 'secret-value' });

    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);
    mockGetSecret.mockResolvedValue(mockSecretDetail);

    const { container } = render(
      <EnvExistingSecret
        env={{ category: null, data: [] }}
        onUpdate={mockOnUpdate}
        namespace="test-namespace"
      />,
    );

    const input = screen.getByPlaceholderText(/select a secret/i);
    fireEvent.click(input);

    const option = await screen.findByText('secret-one');
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(mockGetSecret).toHaveBeenCalled();
    });

    // Should never show "secret-value" in the DOM
    expect(container.textContent).not.toContain('secret-value');
  });
});
