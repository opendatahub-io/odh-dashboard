import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ExistingSecretRef } from '#~/pages/projects/types';
import EnvExistingSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecret';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource);

describe('EnvExistingSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    k8sListResourceMock.mockResolvedValue({
      items: [
        {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'secret-a', namespace: 'ns' },
          data: { KEY_1: 'val1', KEY_2: 'val2' },
          type: 'Opaque',
        },
        {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'secret-b', namespace: 'ns' },
          data: { KEY_3: 'val3' },
          type: 'Opaque',
        },
      ],
    });
  });

  it('should render the secret selector', async () => {
    render(
      <EnvExistingSecret
        existingSecrets={[]}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
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
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-item-secret-a')).toBeInTheDocument();
    });
  });

  it('should render helper text about credential rotation', async () => {
    render(
      <EnvExistingSecret
        existingSecrets={[]}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
      />,
    );
    expect(
      screen.getByText(/Environment variables are set at workbench start/),
    ).toBeInTheDocument();
  });
});
