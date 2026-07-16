import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import EnvExistingSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecret';
import type { ExistingSecretRef } from '#~/pages/projects/types';

jest.mock('#~/pages/projects/ProjectDetailsContext', () => ({
  useProjectContext: jest.fn(() => ({
    currentProject: { metadata: { name: 'test-ns' } },
  })),
}));

jest.mock('../useExistingSecrets', () => ({
  useExistingSecrets: jest.fn(),
}));

const { useExistingSecrets } = jest.requireMock('../useExistingSecrets') as {
  useExistingSecrets: jest.Mock;
};

describe('EnvExistingSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading spinner while secrets are loading', () => {
    useExistingSecrets.mockReturnValue([[], false, undefined, jest.fn()]);
    render(<EnvExistingSecret existingSecretRefs={[]} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-loading')).toBeInTheDocument();
  });

  it('should show error when secrets fail to load', () => {
    useExistingSecrets.mockReturnValue([[], true, new Error('Forbidden'), jest.fn()]);
    render(<EnvExistingSecret existingSecretRefs={[]} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-error')).toBeInTheDocument();
    expect(screen.getByText(/Forbidden/)).toBeInTheDocument();
  });

  it('should show empty message when no eligible secrets exist', () => {
    useExistingSecrets.mockReturnValue([[], true, undefined, jest.fn()]);
    render(<EnvExistingSecret existingSecretRefs={[]} onUpdate={jest.fn()} />);
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
    render(<EnvExistingSecret existingSecretRefs={[]} onUpdate={jest.fn()} />);
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
    render(<EnvExistingSecret existingSecretRefs={refs} onUpdate={jest.fn()} />);
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
    render(
      <EnvExistingSecret existingSecretRefs={[]} onUpdate={jest.fn()} collisions={collisions} />,
    );
    expect(screen.getByTestId('existing-secret-collision-alert')).toBeInTheDocument();
  });
});
