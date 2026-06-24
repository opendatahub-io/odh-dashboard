import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import type { ExistingSecretRef } from '#~/pages/projects/types';
import EnvExistingSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecret';

const mockTypeaheadSelect = jest.fn((props: Record<string, unknown>) => {
  const selectOptions = props.selectOptions as Array<{
    content: string;
    value: string;
  }>;
  const dataTestId = props.dataTestId as string;
  return (
    <div data-testid={dataTestId}>
      {selectOptions.map((opt) => (
        <button
          key={String(opt.value)}
          data-testid={`option-${opt.value}`}
          onClick={(e) => {
            const onSelect = props.onSelect as (
              event: React.MouseEvent | undefined,
              value: string | number,
            ) => void;
            onSelect(e, opt.value);
          }}
        >
          {opt.content}
        </button>
      ))}
    </div>
  );
});

jest.mock('#~/components/TypeaheadSelect', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockTypeaheadSelect(props),
}));

const createSecret = (name: string, dataKeys: Record<string, string> = {}): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name,
    namespace: 'test-ns',
  },
  data: dataKeys,
  type: 'Opaque',
});

const mockSecrets: SecretKind[] = [
  createSecret('db-credentials', { username: 'dXNlcg==', password: 'cGFzcw==' }),
  createSecret('api-keys', { 'api-key': 'a2V5', token: 'dG9rZW4=' }),
  createSecret('empty-secret', {}),
];

jest.mock('#~/pages/projects/screens/spawner/environmentVariables/useNamespaceSecrets', () => ({
  __esModule: true,
  default: () => ({
    data: mockSecrets,
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  }),
}));

describe('EnvExistingSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the add secret button when no refs exist', () => {
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" onUpdate={onUpdate} />);

    expect(screen.getByTestId('add-existing-secret-button')).toBeInTheDocument();
  });

  it('should add a new secret block when add button is clicked', () => {
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" onUpdate={onUpdate} />);

    fireEvent.click(screen.getByTestId('add-existing-secret-button'));
    expect(onUpdate).toHaveBeenCalledWith([{ secretName: '', selectedKeys: [], allKeys: false }]);
  });

  it('should render a typeahead selector for each existing ref', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-credentials', selectedKeys: ['username'], allKeys: false },
    ];
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" existingSecretRefs={refs} onUpdate={onUpdate} />);

    expect(screen.getByTestId('existing-secret-selector-0')).toBeInTheDocument();
  });

  it('should display key names but never secret values', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-credentials', selectedKeys: ['username'], allKeys: false },
    ];
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" existingSecretRefs={refs} onUpdate={onUpdate} />);

    // Key names should be visible as checkbox labels
    expect(screen.getByText('username')).toBeInTheDocument();
    expect(screen.getByText('password')).toBeInTheDocument();

    // Base64-encoded values should never appear
    expect(screen.queryByText('dXNlcg==')).not.toBeInTheDocument();
    expect(screen.queryByText('cGFzcw==')).not.toBeInTheDocument();
    // Decoded values should never appear
    expect(screen.queryByText('user')).not.toBeInTheDocument();
    expect(screen.queryByText('pass')).not.toBeInTheDocument();
  });

  it('should show all keys checkbox and individual key checkboxes', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-credentials', selectedKeys: [], allKeys: false },
    ];
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" existingSecretRefs={refs} onUpdate={onUpdate} />);

    expect(screen.getByTestId('existing-secret-key-select-0')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-all-keys-0')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-key-0-username')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-key-0-password')).toBeInTheDocument();
  });

  it('should call onUpdate with allKeys=true when all keys checkbox is toggled on', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-credentials', selectedKeys: [], allKeys: false },
    ];
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" existingSecretRefs={refs} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByTestId('existing-secret-all-keys-0'));
    expect(onUpdate).toHaveBeenCalledWith([
      {
        secretName: 'db-credentials',
        selectedKeys: ['username', 'password'],
        allKeys: true,
      },
    ]);
  });

  it('should call onUpdate when an individual key is toggled', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-credentials', selectedKeys: [], allKeys: false },
    ];
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" existingSecretRefs={refs} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByTestId('existing-secret-key-0-username'));
    expect(onUpdate).toHaveBeenCalledWith([
      {
        secretName: 'db-credentials',
        selectedKeys: ['username'],
        allKeys: false,
      },
    ]);
  });

  it('should call onUpdate to remove a secret block', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-credentials', selectedKeys: ['username'], allKeys: false },
      { secretName: 'api-keys', selectedKeys: ['api-key'], allKeys: false },
    ];
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" existingSecretRefs={refs} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByTestId('remove-existing-secret-0'));
    expect(onUpdate).toHaveBeenCalledWith([
      { secretName: 'api-keys', selectedKeys: ['api-key'], allKeys: false },
    ]);
  });

  it('should update secret name when a secret is selected from the typeahead', () => {
    const refs: ExistingSecretRef[] = [{ secretName: '', selectedKeys: [], allKeys: false }];
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" existingSecretRefs={refs} onUpdate={onUpdate} />);

    // Click on a secret option in the mocked typeahead
    fireEvent.click(screen.getByTestId('option-db-credentials'));
    expect(onUpdate).toHaveBeenCalledWith([
      { secretName: 'db-credentials', selectedKeys: [], allKeys: false },
    ]);
  });

  it('should not render key selection when no secret is selected', () => {
    const refs: ExistingSecretRef[] = [{ secretName: '', selectedKeys: [], allKeys: false }];
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" existingSecretRefs={refs} onUpdate={onUpdate} />);

    expect(screen.queryByTestId('existing-secret-key-select-0')).not.toBeInTheDocument();
  });

  it('should handle multiple secret blocks independently', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-credentials', selectedKeys: ['username'], allKeys: false },
      { secretName: 'api-keys', selectedKeys: [], allKeys: false },
    ];
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" existingSecretRefs={refs} onUpdate={onUpdate} />);

    expect(screen.getByTestId('existing-secret-selector-0')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-selector-1')).toBeInTheDocument();
  });

  it('should deselect allKeys when an individual key is unchecked', () => {
    const refs: ExistingSecretRef[] = [
      {
        secretName: 'db-credentials',
        selectedKeys: ['username', 'password'],
        allKeys: true,
      },
    ];
    const onUpdate = jest.fn();
    render(<EnvExistingSecret namespace="test-ns" existingSecretRefs={refs} onUpdate={onUpdate} />);

    // Uncheck 'username' — allKeys should become false
    fireEvent.click(screen.getByTestId('existing-secret-key-0-username'));
    expect(onUpdate).toHaveBeenCalledWith([
      {
        secretName: 'db-credentials',
        selectedKeys: ['password'],
        allKeys: false,
      },
    ]);
  });
});
