import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import EnvExistingSecretField from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecretField';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets', () => ({
  useExistingSecrets: jest.fn(),
}));

const mockTypeaheadSelect = jest.fn((props: Record<string, unknown>) => (
  <div data-testid={props.dataTestId as string}>
    <button
      data-testid="typeahead-trigger"
      onClick={() => {
        const onSelect = props.onSelect as (event: unknown, value: string) => void;
        onSelect(undefined, 's3-credentials');
      }}
    >
      {String(props.placeholder)}
    </button>
  </div>
));

jest.mock('@odh-dashboard/ui-core/components/TypeaheadSelect', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockTypeaheadSelect(props),
}));

const mockUseExistingSecrets = jest.mocked(useExistingSecrets);

const mockSecrets: SecretKind[] = [
  {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: 's3-credentials', namespace: 'test-ns' },
    type: 'Opaque',
    data: {
      AWS_ACCESS_KEY_ID: 'dGVzdA==',
      AWS_SECRET_ACCESS_KEY: 'dGVzdA==',
      AWS_DEFAULT_REGION: 'dGVzdA==',
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: 'db-password', namespace: 'test-ns' },
    type: 'Opaque',
    data: { DB_PASSWORD: 'dGVzdA==' },
  },
];

const mockContextValue = {
  currentProject: {
    apiVersion: 'v1',
    kind: 'Project',
    metadata: { name: 'test-ns' },
  },
} as React.ComponentProps<typeof ProjectDetailsContext.Provider>['value'];

const renderWithContext = (ui: React.ReactElement) =>
  render(
    <ProjectDetailsContext.Provider value={mockContextValue}>{ui}</ProjectDetailsContext.Provider>,
  );

describe('EnvExistingSecretField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExistingSecrets.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);
  });

  it('should render the secret typeahead dropdown', () => {
    renderWithContext(<EnvExistingSecretField selectedKeys={[]} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-select')).toBeInTheDocument();
  });

  it('should show loading spinner while secrets are loading', () => {
    mockUseExistingSecrets.mockReturnValue([[], false, undefined, jest.fn()]);
    renderWithContext(<EnvExistingSecretField selectedKeys={[]} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-loading')).toBeInTheDocument();
  });

  it('should show error message when secrets fail to load', () => {
    mockUseExistingSecrets.mockReturnValue([[], true, new Error('Forbidden'), jest.fn()]);
    renderWithContext(<EnvExistingSecretField selectedKeys={[]} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-error')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load secrets/)).toBeInTheDocument();
  });

  it('should not show the typeahead when loading', () => {
    mockUseExistingSecrets.mockReturnValue([[], false, undefined, jest.fn()]);
    renderWithContext(<EnvExistingSecretField selectedKeys={[]} onUpdate={jest.fn()} />);
    expect(screen.queryByTestId('existing-secret-select')).not.toBeInTheDocument();
  });

  it('should show key checkboxes when a secret is selected', () => {
    renderWithContext(
      <EnvExistingSecretField
        secretName="s3-credentials"
        selectedKeys={[
          { key: 'AWS_ACCESS_KEY_ID', value: '' },
          { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
          { key: 'AWS_DEFAULT_REGION', value: '' },
        ]}
        onUpdate={jest.fn()}
      />,
    );
    expect(screen.getByTestId('existing-secret-select-all')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-key-AWS_ACCESS_KEY_ID')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-key-AWS_SECRET_ACCESS_KEY')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-key-AWS_DEFAULT_REGION')).toBeInTheDocument();
  });

  it('should not show key checkboxes when no secret is selected', () => {
    renderWithContext(<EnvExistingSecretField selectedKeys={[]} onUpdate={jest.fn()} />);
    expect(screen.queryByTestId('existing-secret-select-all')).not.toBeInTheDocument();
  });

  it('should call onUpdate when a key checkbox is toggled off', () => {
    const onUpdate = jest.fn();
    renderWithContext(
      <EnvExistingSecretField
        secretName="s3-credentials"
        selectedKeys={[
          { key: 'AWS_ACCESS_KEY_ID', value: '' },
          { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
          { key: 'AWS_DEFAULT_REGION', value: '' },
        ]}
        onUpdate={onUpdate}
      />,
    );
    fireEvent.click(screen.getByTestId('existing-secret-key-AWS_DEFAULT_REGION'));
    expect(onUpdate).toHaveBeenCalledWith({
      secretName: 's3-credentials',
      keys: [
        { key: 'AWS_ACCESS_KEY_ID', value: '' },
        { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
      ],
    });
  });

  it('should call onUpdate when a key checkbox is toggled on', () => {
    const onUpdate = jest.fn();
    renderWithContext(
      <EnvExistingSecretField
        secretName="s3-credentials"
        selectedKeys={[{ key: 'AWS_ACCESS_KEY_ID', value: '' }]}
        onUpdate={onUpdate}
      />,
    );
    fireEvent.click(screen.getByTestId('existing-secret-key-AWS_SECRET_ACCESS_KEY'));
    expect(onUpdate).toHaveBeenCalledWith({
      secretName: 's3-credentials',
      keys: [
        { key: 'AWS_ACCESS_KEY_ID', value: '' },
        { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
      ],
    });
  });

  it('should call onUpdate with all keys when select-all is clicked', () => {
    const onUpdate = jest.fn();
    renderWithContext(
      <EnvExistingSecretField secretName="s3-credentials" selectedKeys={[]} onUpdate={onUpdate} />,
    );
    fireEvent.click(screen.getByTestId('existing-secret-select-all'));
    expect(onUpdate).toHaveBeenCalledWith({
      secretName: 's3-credentials',
      keys: [
        { key: 'AWS_ACCESS_KEY_ID', value: '' },
        { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
        { key: 'AWS_DEFAULT_REGION', value: '' },
      ],
    });
  });

  it('should call onUpdate with empty keys when select-all is unchecked', () => {
    const onUpdate = jest.fn();
    renderWithContext(
      <EnvExistingSecretField
        secretName="s3-credentials"
        selectedKeys={[
          { key: 'AWS_ACCESS_KEY_ID', value: '' },
          { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
          { key: 'AWS_DEFAULT_REGION', value: '' },
        ]}
        onUpdate={onUpdate}
      />,
    );
    // All keys are selected, so allKeysSelected is true; clicking unchecks
    fireEvent.click(screen.getByTestId('existing-secret-select-all'));
    expect(onUpdate).toHaveBeenCalledWith({
      secretName: 's3-credentials',
      keys: [],
    });
  });

  it('should call onUpdate with all keys when a secret is selected from dropdown', () => {
    const onUpdate = jest.fn();
    renderWithContext(<EnvExistingSecretField selectedKeys={[]} onUpdate={onUpdate} />);
    // Our mock TypeaheadSelect triggers onSelect with 's3-credentials' on click
    fireEvent.click(screen.getByTestId('typeahead-trigger'));
    expect(onUpdate).toHaveBeenCalledWith({
      secretName: 's3-credentials',
      keys: [
        { key: 'AWS_ACCESS_KEY_ID', value: '' },
        { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
        { key: 'AWS_DEFAULT_REGION', value: '' },
      ],
    });
  });

  it('should pass correct selectOptions to TypeaheadSelect', () => {
    renderWithContext(<EnvExistingSecretField selectedKeys={[]} onUpdate={jest.fn()} />);
    expect(mockTypeaheadSelect).toHaveBeenCalled();
    const props = mockTypeaheadSelect.mock.calls[0][0];
    expect(props.selectOptions).toEqual([
      { content: 's3-credentials', value: 's3-credentials' },
      { content: 'db-password', value: 'db-password' },
    ]);
  });

  it('should pass the namespace from project context to useExistingSecrets', () => {
    renderWithContext(<EnvExistingSecretField selectedKeys={[]} onUpdate={jest.fn()} />);
    expect(mockUseExistingSecrets).toHaveBeenCalledWith('test-ns', true);
  });
});
