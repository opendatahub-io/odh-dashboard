import React from 'react';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
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
      apiVersion: 'v1',
      metadata: {
        resourceVersion: '1234',
        continue: '',
      },
      items: [
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

  it('should render the secrets form group', async () => {
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
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-collision-alert')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    k8sListResourceMock.mockReturnValue(
      new Promise(() => {
        /* intentionally never resolves */
      }),
    );
    render(
      <EnvExistingSecret
        existingSecrets={[]}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
      />,
    );
    // Click the typeahead input to open the dropdown
    await act(async () => {
      fireEvent.click(screen.getByPlaceholderText('Select secrets'));
    });
    expect(screen.getByTestId('existing-secret-loading')).toBeInTheDocument();
  });

  it('should show error state when loading fails', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('forbidden'));
    render(
      <EnvExistingSecret
        existingSecrets={[]}
        namespace="ns"
        onUpdate={jest.fn()}
        connections={[]}
        inlineEnvVars={[]}
      />,
    );
    await act(async () => {
      await new Promise<void>((r) => {
        setTimeout(r, 0);
      });
    });
    // Click the typeahead input to open the dropdown
    await act(async () => {
      fireEvent.click(screen.getByPlaceholderText('Select secrets'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('existing-secret-error')).toBeInTheDocument();
    });
  });
});
