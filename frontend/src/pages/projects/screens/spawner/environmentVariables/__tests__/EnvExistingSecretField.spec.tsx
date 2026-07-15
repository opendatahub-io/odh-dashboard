import React from 'react';
import { render, screen } from '@testing-library/react';
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

    const keyCheckboxes = screen.getAllByTestId('existing-secret-key-checkbox');
    expect(keyCheckboxes).toHaveLength(3);
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
});
