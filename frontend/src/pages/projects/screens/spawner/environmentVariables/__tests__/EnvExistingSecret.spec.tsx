import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { ExistingSecretRef } from '#~/pages/projects/types';
import EnvExistingSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecret';

const mockSecrets = [
  mockCustomSecretK8sResource({
    name: 'secret-a',
    namespace: 'ns',
    data: { KEY_1: 'val1', KEY_2: 'val2' },
    type: 'Opaque',
  }),
  mockCustomSecretK8sResource({
    name: 'secret-b',
    namespace: 'ns',
    data: { KEY_3: 'val3' },
    type: 'Opaque',
  }),
];

describe('EnvExistingSecret', () => {
  it('should render the secret selector', async () => {
    render(
      <EnvExistingSecret
        existingSecrets={[]}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
        availableSecrets={mockSecrets}
        secretsLoaded
        secretsLoadError={undefined}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-select-toggle')).toBeInTheDocument();
    });
  });

  it('should render selected secrets as expandable items', async () => {
    const selected: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['KEY_1'], allKeys: ['KEY_1', 'KEY_2'] },
    ];
    render(
      <EnvExistingSecret
        existingSecrets={selected}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
        availableSecrets={mockSecrets}
        secretsLoaded
        secretsLoadError={undefined}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-item-secret-a')).toBeInTheDocument();
    });
  });

  it('should render the secrets form group', async () => {
    render(
      <EnvExistingSecret
        existingSecrets={[]}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
        availableSecrets={mockSecrets}
        secretsLoaded
        secretsLoadError={undefined}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Secrets')).toBeInTheDocument();
    });
  });

  it('should display key count badge for selected secret', async () => {
    const selected: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['KEY_1'], allKeys: ['KEY_1', 'KEY_2'] },
    ];
    render(
      <EnvExistingSecret
        existingSecrets={selected}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
        availableSecrets={mockSecrets}
        secretsLoaded
        secretsLoadError={undefined}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('secret-key-badge-secret-a')).toHaveTextContent('1 of 2 keys');
    });
  });

  it('should show collision alert when key names overlap', async () => {
    const selected: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['SHARED_KEY'], allKeys: ['SHARED_KEY', 'KEY_2'] },
      { secretName: 'secret-b', selectedKeys: ['SHARED_KEY'], allKeys: ['SHARED_KEY', 'KEY_3'] },
    ];
    render(
      <EnvExistingSecret
        existingSecrets={selected}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
        availableSecrets={mockSecrets}
        secretsLoaded
        secretsLoadError={undefined}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-collision-alert')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    render(
      <EnvExistingSecret
        existingSecrets={[]}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
        availableSecrets={[]}
        secretsLoaded={false}
        secretsLoadError={undefined}
      />,
    );
    // Click the typeahead input to open the dropdown
    fireEvent.click(screen.getByPlaceholderText('Select secrets'));
    expect(screen.getByTestId('existing-secret-loading')).toBeInTheDocument();
  });

  it('should show error state when loading fails', async () => {
    render(
      <EnvExistingSecret
        existingSecrets={[]}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
        availableSecrets={[]}
        secretsLoaded={false}
        secretsLoadError={new Error('forbidden')}
      />,
    );
    // Click the typeahead input to open the dropdown
    fireEvent.click(screen.getByPlaceholderText('Select secrets'));
    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-error')).toBeInTheDocument();
    });
  });

  it('should call onUpdate when keys are deselected for a secret', async () => {
    const onUpdate = jest.fn();
    const selected: ExistingSecretRef[] = [
      { secretName: 'secret-a', selectedKeys: ['KEY_1'], allKeys: ['KEY_1', 'KEY_2'] },
    ];
    render(
      <EnvExistingSecret
        existingSecrets={selected}
        namespace="ns"
        onUpdate={onUpdate}
        connections={[]}
        inlineEnvVars={[]}
        availableSecrets={mockSecrets}
        secretsLoaded
        secretsLoadError={undefined}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-item-secret-a')).toBeInTheDocument();
    });
    // Expand the secret item to reveal controls
    fireEvent.click(screen.getByText('secret-a'));
    await waitFor(() => {
      expect(screen.getByTestId('deselect-all-keys-secret-a')).toBeInTheDocument();
    });
    // Click "Deselect all" to trigger onUpdate
    fireEvent.click(screen.getByTestId('deselect-all-keys-secret-a'));
    expect(onUpdate).toHaveBeenCalledWith([
      { secretName: 'secret-a', selectedKeys: [], allKeys: ['KEY_1', 'KEY_2'] },
    ]);
  });
});
