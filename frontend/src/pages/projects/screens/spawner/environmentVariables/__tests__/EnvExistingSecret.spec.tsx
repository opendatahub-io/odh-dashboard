import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import EnvExistingSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecret';
import type { ExistingSecretRef } from '#~/pages/projects/types';

jest.mock('../useExistingSecrets', () => ({
  useExistingSecrets: jest.fn(),
}));

const { useExistingSecrets } = jest.mocked(
  jest.requireMock<typeof import('../useExistingSecrets')>('../useExistingSecrets'),
);

const mockContextValue = {
  currentProject: { metadata: { name: 'test-ns' } },
} as unknown as ProjectDetailsContextType;

const renderWithContext = (ui: React.ReactElement) =>
  render(
    <ProjectDetailsContext.Provider value={mockContextValue}>{ui}</ProjectDetailsContext.Provider>,
  );

describe('EnvExistingSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading spinner while secrets are loading', () => {
    useExistingSecrets.mockReturnValue([[], false, undefined, jest.fn()]);
    renderWithContext(<EnvExistingSecret existingSecretRefs={[]} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-loading')).toBeInTheDocument();
  });

  it('should show error when secrets fail to load', () => {
    useExistingSecrets.mockReturnValue([[], true, new Error('Forbidden'), jest.fn()]);
    renderWithContext(<EnvExistingSecret existingSecretRefs={[]} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-error')).toBeInTheDocument();
    expect(screen.getByText(/Forbidden/)).toBeInTheDocument();
  });

  it('should show empty message when no eligible secrets exist', () => {
    useExistingSecrets.mockReturnValue([[], true, undefined, jest.fn()]);
    renderWithContext(<EnvExistingSecret existingSecretRefs={[]} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-empty')).toBeInTheDocument();
  });

  it('should render dropdown when secrets are available', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'test-secret',
      namespace: 'test-ns',
      data: { KEY: 'dmFsdWU=' },
      type: 'Opaque',
      labels: {},
      annotations: {},
    });
    useExistingSecrets.mockReturnValue([[secret], true, undefined, jest.fn()]);
    renderWithContext(<EnvExistingSecret existingSecretRefs={[]} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-select-toggle')).toBeInTheDocument();
  });

  it('should render selected secret items', () => {
    const secret = mockCustomSecretK8sResource({
      name: 'my-secret',
      namespace: 'test-ns',
      data: { KEY_A: 'dmFsdWU=', KEY_B: 'dmFsdWU=' },
      type: 'Opaque',
      labels: {},
      annotations: {},
    });
    useExistingSecrets.mockReturnValue([[secret], true, undefined, jest.fn()]);

    const refs: ExistingSecretRef[] = [
      {
        secretName: 'my-secret',
        allKeys: true,
        selectedKeys: ['KEY_A', 'KEY_B'],
        availableKeys: ['KEY_A', 'KEY_B'],
      },
    ];
    renderWithContext(<EnvExistingSecret existingSecretRefs={refs} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-item-my-secret')).toBeInTheDocument();
  });

  it('should render collision alert when collisions exist', () => {
    useExistingSecrets.mockReturnValue([[], true, undefined, jest.fn()]);
    const collisions = [
      {
        key: 'SHARED_KEY',
        sources: [
          { type: 'existing-secret' as const, name: 'secret-a' },
          { type: 'existing-secret' as const, name: 'secret-b' },
        ],
      },
    ];
    renderWithContext(
      <EnvExistingSecret existingSecretRefs={[]} onUpdate={jest.fn()} collisions={collisions} />,
    );
    expect(screen.getByTestId('existing-secret-collision-alert')).toBeInTheDocument();
  });

  it('should call onUpdate with new ref when a secret is selected', async () => {
    const secret = mockCustomSecretK8sResource({
      name: 'db-secret',
      namespace: 'test-ns',
      data: { DB_HOST: 'aG9zdA==', DB_PORT: 'NTQzMg==' },
      type: 'Opaque',
      labels: {},
      annotations: {},
    });
    useExistingSecrets.mockReturnValue([[secret], true, undefined, jest.fn()]);
    const onUpdate = jest.fn();
    renderWithContext(<EnvExistingSecret existingSecretRefs={[]} onUpdate={onUpdate} />);

    // Open the dropdown by clicking the typeahead input
    const input = screen.getByTestId('existing-secret-typeahead-input');
    fireEvent.click(input);

    // Select the secret option -- click the checkbox inside the PF6 SelectOption
    const option = await screen.findByTestId('existing-secret-option-db-secret');
    const checkbox = within(option).getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updatedRefs = onUpdate.mock.calls[0][0] as ExistingSecretRef[];
    expect(updatedRefs).toHaveLength(1);
    expect(updatedRefs[0].secretName).toBe('db-secret');
    expect(updatedRefs[0].allKeys).toBe(true);
    expect(updatedRefs[0].selectedKeys).toEqual(expect.arrayContaining(['DB_HOST', 'DB_PORT']));
    expect(updatedRefs[0].selectedKeys).toHaveLength(2);
  });
});
