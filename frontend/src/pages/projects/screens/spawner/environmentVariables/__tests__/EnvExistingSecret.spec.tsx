import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnvExistingSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecret';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import {
  useExistingSecrets,
  useListSecretsAllowed,
} from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets', () => ({
  useExistingSecrets: jest.fn(),
  useListSecretsAllowed: jest.fn(),
}));

const useExistingSecretsMock = jest.mocked(useExistingSecrets);
const useListSecretsAllowedMock = jest.mocked(useListSecretsAllowed);

const mockProjectContext = {
  currentProject: {
    metadata: { name: 'test-project', namespace: 'test-project' },
    kind: 'Project',
    apiVersion: 'v1',
  },
} as unknown as React.ContextType<typeof ProjectDetailsContext>;

const renderComponent = (props: Partial<React.ComponentProps<typeof EnvExistingSecret>> = {}) => {
  const defaultProps = {
    instanceId: 0,
    existingSecretRefs: [],
    onUpdate: jest.fn(),
    ...props,
  };

  return render(
    <ProjectDetailsContext.Provider value={mockProjectContext}>
      <EnvExistingSecret {...defaultProps} />
    </ProjectDetailsContext.Provider>,
  );
};

describe('EnvExistingSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useListSecretsAllowedMock.mockReturnValue([true, true]);
    useExistingSecretsMock.mockReturnValue([
      [
        { name: 'db-credentials', keys: ['DB_HOST', 'DB_PORT', 'DB_PASS'] },
        { name: 'api-config', keys: ['API_KEY', 'API_URL'] },
      ],
      true,
      undefined,
      jest.fn(),
    ]);
  });

  it('should show spinner while loading', () => {
    useListSecretsAllowedMock.mockReturnValue([true, false]);
    renderComponent();
    expect(screen.getByTestId('existing-secret-spinner')).toBeInTheDocument();
  });

  it('should show no-permission alert when RBAC denies access', () => {
    useListSecretsAllowedMock.mockReturnValue([false, true]);
    renderComponent();
    expect(screen.getByTestId('existing-secret-no-permission')).toBeInTheDocument();
  });

  it('should render description text and secrets dropdown when loaded', () => {
    renderComponent();
    expect(screen.getByText(/Attach an available secret/)).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-select-0')).toBeInTheDocument();
  });

  it('should show "Secrets" label as required when secrets are selected', () => {
    renderComponent({
      existingSecretRefs: [
        { secretName: 'db-credentials', selectedKeys: ['DB_HOST'], allKeys: false },
      ],
    });
    const label = screen.getByText('Secrets');
    expect(label.closest('.pf-v6-c-form__group')).toBeInTheDocument();
  });

  it('should not show restart info when no secrets are selected', () => {
    renderComponent({ existingSecretRefs: [] });
    expect(screen.queryByText(/Environment variables are set/)).not.toBeInTheDocument();
  });

  it('should render selected secret row with key badge', () => {
    renderComponent({
      existingSecretRefs: [
        { secretName: 'db-credentials', selectedKeys: ['DB_HOST', 'DB_PORT'], allKeys: false },
      ],
    });

    const row = screen.getByTestId('existing-secret-row-db-credentials');
    expect(row).toBeInTheDocument();
    expect(within(row).getByText('2 of 3 keys')).toBeInTheDocument();
    expect(screen.getByText(/Environment variables are set/)).toBeInTheDocument();
  });

  it('should render key checkboxes for selected secret', () => {
    renderComponent({
      existingSecretRefs: [
        { secretName: 'db-credentials', selectedKeys: ['DB_HOST', 'DB_PORT'], allKeys: false },
      ],
    });

    expect(screen.getByTestId('existing-secret-0-db-credentials-key-DB_HOST')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-0-db-credentials-key-DB_PORT')).toBeInTheDocument();
  });

  it('should call onUpdate when remove button is clicked', () => {
    const onUpdate = jest.fn();
    renderComponent({
      existingSecretRefs: [
        { secretName: 'db-credentials', selectedKeys: ['DB_HOST'], allKeys: false },
      ],
      onUpdate,
    });

    fireEvent.click(screen.getByTestId('remove-existing-secret-db-credentials'));
    expect(onUpdate).toHaveBeenCalledWith([]);
  });

  it('should render multiple selected secrets', () => {
    renderComponent({
      existingSecretRefs: [
        { secretName: 'db-credentials', selectedKeys: ['DB_HOST'], allKeys: false },
        { secretName: 'api-config', selectedKeys: ['API_KEY', 'API_URL'], allKeys: true },
      ],
    });

    expect(screen.getByTestId('existing-secret-row-db-credentials')).toBeInTheDocument();
    expect(screen.getByTestId('existing-secret-row-api-config')).toBeInTheDocument();
  });
});
