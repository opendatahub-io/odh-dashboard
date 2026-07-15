import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import { SecretCategory, EnvVariableData } from '#~/pages/projects/types';
import { DEFAULT_LIST_FETCH_STATE } from '#~/utilities/const';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';
import EnvExistingSecretField from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecretField';

jest.mock('../useExistingSecrets');

const mockUseExistingSecrets = jest.mocked(useExistingSecrets);

const mockSecret = (name: string, keys: string[]): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  type: 'Opaque',
  metadata: { name, namespace: 'test-project', annotations: {} },
  data: keys.reduce<Record<string, string>>((acc, k) => ({ ...acc, [k]: btoa(`value-${k}`) }), {}),
});

const currentProject = mockProjectK8sResource({ k8sName: 'test-project' });

const renderWithContext = (ui: React.ReactElement) =>
  render(
    <ProjectDetailsContext.Provider
      value={
        {
          currentProject,
          notebooks: DEFAULT_LIST_FETCH_STATE,
          pvcs: DEFAULT_LIST_FETCH_STATE,
          connections: DEFAULT_LIST_FETCH_STATE,
          serverSecrets: DEFAULT_LIST_FETCH_STATE,
        } as unknown as ProjectDetailsContextType
      }
    >
      {ui}
    </ProjectDetailsContext.Provider>,
  );

describe('EnvExistingSecretField', () => {
  const onUpdate = jest.fn();
  const onUpdateVariable = jest.fn();
  const defaultEnv: EnvVariableData = {
    category: SecretCategory.EXISTING,
    data: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExistingSecrets.mockReturnValue([
      [mockSecret('db-credentials', ['DB_HOST', 'DB_PASSWORD', 'DB_PORT'])],
      true,
      undefined,
      jest.fn(),
    ]);
  });

  it('should render the typeahead select for secret selection', () => {
    renderWithContext(
      <EnvExistingSecretField
        env={defaultEnv}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
      />,
    );

    expect(screen.getByTestId('existing-secret-select')).toBeInTheDocument();
  });

  it('should show loading spinner while secrets are loading', () => {
    mockUseExistingSecrets.mockReturnValue([[], false, undefined, jest.fn()]);

    renderWithContext(
      <EnvExistingSecretField
        env={defaultEnv}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
      />,
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show error state when loading secrets fails', () => {
    mockUseExistingSecrets.mockReturnValue([[], false, new Error('Network error'), jest.fn()]);

    renderWithContext(
      <EnvExistingSecretField
        env={defaultEnv}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
      />,
    );

    expect(screen.getByText('Failed to load secrets')).toBeInTheDocument();
  });

  it('should show empty state when no secrets available', () => {
    mockUseExistingSecrets.mockReturnValue([[], true, undefined, jest.fn()]);

    renderWithContext(
      <EnvExistingSecretField
        env={defaultEnv}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
      />,
    );

    expect(screen.getByText('No existing secrets found in this namespace')).toBeInTheDocument();
  });

  it('should show key checkboxes when a secret has been selected', () => {
    const envWithSecret: EnvVariableData = {
      category: SecretCategory.EXISTING,
      data: [{ key: 'DB_HOST', value: '' }],
    };

    renderWithContext(
      <EnvExistingSecretField
        env={envWithSecret}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
        selectedSecretName="db-credentials"
      />,
    );

    expect(screen.getByTestId('existing-secret-key-checkboxes')).toBeInTheDocument();
  });

  it('should not show key checkboxes when no secret is selected', () => {
    renderWithContext(
      <EnvExistingSecretField
        env={defaultEnv}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
      />,
    );

    expect(screen.queryByTestId('existing-secret-key-checkboxes')).not.toBeInTheDocument();
  });

  it('should display all keys from selected secret as checkboxes', () => {
    const envWithAllKeys: EnvVariableData = {
      category: SecretCategory.EXISTING,
      data: [
        { key: 'DB_HOST', value: '' },
        { key: 'DB_PASSWORD', value: '' },
        { key: 'DB_PORT', value: '' },
      ],
    };

    renderWithContext(
      <EnvExistingSecretField
        env={envWithAllKeys}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
        selectedSecretName="db-credentials"
      />,
    );

    expect(screen.getByTestId('existing-secret-key-checkbox-DB_HOST')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-key-checkbox-DB_PASSWORD')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-key-checkbox-DB_PORT')).toBeInTheDocument();
  });

  it('should show select-all checkbox when a secret is selected', () => {
    const envWithSecret: EnvVariableData = {
      category: SecretCategory.EXISTING,
      data: [{ key: 'DB_HOST', value: '' }],
    };

    renderWithContext(
      <EnvExistingSecretField
        env={envWithSecret}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
        selectedSecretName="db-credentials"
      />,
    );

    expect(screen.getByTestId('existing-secret-select-all')).toBeInTheDocument();
  });

  it('should call onUpdate with all keys when select-all checkbox is checked', () => {
    const envEmpty: EnvVariableData = {
      category: SecretCategory.EXISTING,
      data: [],
    };

    renderWithContext(
      <EnvExistingSecretField
        env={envEmpty}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
        selectedSecretName="db-credentials"
      />,
    );

    const selectAllCheckbox = screen.getByTestId('existing-secret-select-all');
    fireEvent.click(selectAllCheckbox);

    expect(onUpdate).toHaveBeenCalledWith({
      ...envEmpty,
      data: [
        { key: 'DB_HOST', value: '' },
        { key: 'DB_PASSWORD', value: '' },
        { key: 'DB_PORT', value: '' },
      ],
    });
  });

  it('should call onUpdate with empty data when select-all checkbox is unchecked', () => {
    const envWithAllKeys: EnvVariableData = {
      category: SecretCategory.EXISTING,
      data: [
        { key: 'DB_HOST', value: '' },
        { key: 'DB_PASSWORD', value: '' },
        { key: 'DB_PORT', value: '' },
      ],
    };

    renderWithContext(
      <EnvExistingSecretField
        env={envWithAllKeys}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
        selectedSecretName="db-credentials"
      />,
    );

    const selectAllCheckbox = screen.getByTestId('existing-secret-select-all');
    fireEvent.click(selectAllCheckbox);

    expect(onUpdate).toHaveBeenCalledWith({
      ...envWithAllKeys,
      data: [],
    });
  });

  it('should call onUpdate with the key added when an individual key checkbox is checked', () => {
    const envWithOneKey: EnvVariableData = {
      category: SecretCategory.EXISTING,
      data: [{ key: 'DB_HOST', value: '' }],
    };

    renderWithContext(
      <EnvExistingSecretField
        env={envWithOneKey}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
        selectedSecretName="db-credentials"
      />,
    );

    const passwordCheckbox = screen.getByTestId('existing-secret-key-checkbox-DB_PASSWORD');
    fireEvent.click(passwordCheckbox);

    expect(onUpdate).toHaveBeenCalledWith({
      ...envWithOneKey,
      data: [
        { key: 'DB_HOST', value: '' },
        { key: 'DB_PASSWORD', value: '' },
      ],
    });
  });

  it('should call onUpdate with the key removed when an individual key checkbox is unchecked', () => {
    const envWithTwoKeys: EnvVariableData = {
      category: SecretCategory.EXISTING,
      data: [
        { key: 'DB_HOST', value: '' },
        { key: 'DB_PASSWORD', value: '' },
      ],
    };

    renderWithContext(
      <EnvExistingSecretField
        env={envWithTwoKeys}
        onUpdate={onUpdate}
        onUpdateVariable={onUpdateVariable}
        selectedSecretName="db-credentials"
      />,
    );

    const hostCheckbox = screen.getByTestId('existing-secret-key-checkbox-DB_HOST');
    fireEvent.click(hostCheckbox);

    expect(onUpdate).toHaveBeenCalledWith({
      ...envWithTwoKeys,
      data: [{ key: 'DB_PASSWORD', value: '' }],
    });
  });
});
