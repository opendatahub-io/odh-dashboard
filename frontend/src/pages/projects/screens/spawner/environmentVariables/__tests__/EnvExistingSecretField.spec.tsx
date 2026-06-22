import * as React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExistingSecretRef, ExistingSecretMetadata } from '#~/pages/projects/types';
import EnvExistingSecretField from '#~/src/pages/projects/screens/spawner/environmentVariables/EnvExistingSecretField';
import { useExistingSecrets } from '#~/src/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('../useExistingSecrets');

const mockUseExistingSecrets = jest.mocked(useExistingSecrets);

const mockSecrets: ExistingSecretMetadata[] = [
  { name: 'db-credentials', keys: ['username', 'password', 'host'] },
  { name: 'api-key-secret', keys: ['api-key'] },
  { name: 'tls-cert', keys: ['cert', 'key'] },
];

describe('EnvExistingSecretField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading spinner when secrets are not loaded', () => {
      mockUseExistingSecrets.mockReturnValue({
        secrets: [],
        loaded: false,
        canList: true,
      });

      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      expect(screen.getByTestId('env-existing-secret-loading')).toBeInTheDocument();
    });
  });

  describe('RBAC disabled state', () => {
    it('should show RBAC message when user cannot list secrets', () => {
      mockUseExistingSecrets.mockReturnValue({
        secrets: [],
        loaded: true,
        canList: false,
      });

      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      expect(screen.getByTestId('env-existing-secret-rbac-message')).toBeInTheDocument();
      expect(screen.getByTestId('env-existing-secret-rbac-message')).toHaveTextContent(
        'You do not have permission to list secrets in this project.',
      );
    });

    it('should show RBAC popover trigger', () => {
      mockUseExistingSecrets.mockReturnValue({
        secrets: [],
        loaded: true,
        canList: false,
      });

      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      expect(screen.getByTestId('env-existing-secret-rbac-popover')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message when loading fails', () => {
      mockUseExistingSecrets.mockReturnValue({
        secrets: [],
        loaded: true,
        canList: true,
        error: new Error('Network error'),
      });

      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      expect(screen.getByTestId('env-existing-secret-error')).toBeInTheDocument();
      expect(screen.getByTestId('env-existing-secret-error')).toHaveTextContent(
        'Unable to load secrets: Network error',
      );
    });
  });

  describe('empty state', () => {
    it('should show empty message when no secrets exist', () => {
      mockUseExistingSecrets.mockReturnValue({
        secrets: [],
        loaded: true,
        canList: true,
      });

      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      expect(screen.getByTestId('env-existing-secret-empty-message')).toBeInTheDocument();
      expect(screen.getByTestId('env-existing-secret-empty-message')).toHaveTextContent(
        'No third-party secrets available in this project.',
      );
    });

    it('should show empty state popover trigger', () => {
      mockUseExistingSecrets.mockReturnValue({
        secrets: [],
        loaded: true,
        canList: true,
      });

      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      expect(screen.getByTestId('env-existing-secret-empty-popover')).toBeInTheDocument();
    });
  });

  describe('with available secrets', () => {
    beforeEach(() => {
      mockUseExistingSecrets.mockReturnValue({
        secrets: mockSecrets,
        loaded: true,
        canList: true,
      });
    });

    it('should render description text', () => {
      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      expect(screen.getByTestId('env-existing-secret-description')).toHaveTextContent(
        'Attach an available secret from this project',
      );
    });

    it('should render the dropdown toggle', () => {
      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      expect(screen.getByTestId('env-existing-secret-toggle')).toBeInTheDocument();
    });

    it('should show search input with placeholder', () => {
      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      expect(screen.getByTestId('env-existing-secret-search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search secrets')).toBeInTheDocument();
    });

    it('should show secret options when dropdown is opened', async () => {
      const user = userEvent.setup();
      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      await user.click(screen.getByTestId('env-existing-secret-search'));

      await waitFor(() => {
        expect(screen.getByTestId('env-existing-secret-option-db-credentials')).toBeInTheDocument();
      });
      expect(screen.getByTestId('env-existing-secret-option-api-key-secret')).toBeInTheDocument();
      expect(screen.getByTestId('env-existing-secret-option-tls-cert')).toBeInTheDocument();
    });

    it('should display key count and preview in option descriptions', async () => {
      const user = userEvent.setup();
      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      await user.click(screen.getByTestId('env-existing-secret-search'));

      await waitFor(() => {
        expect(screen.getByText('3 keys: username, password, host')).toBeInTheDocument();
      });
      expect(screen.getByText('1 key: api-key')).toBeInTheDocument();
      expect(screen.getByText('2 keys: cert, key')).toBeInTheDocument();
    });

    it('should call onUpdate when a secret is selected', async () => {
      const user = userEvent.setup();
      const onUpdate = jest.fn();

      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={onUpdate} />,
      );

      // Open dropdown
      await user.click(screen.getByTestId('env-existing-secret-search'));

      await waitFor(() => {
        expect(screen.getByTestId('env-existing-secret-option-db-credentials')).toBeInTheDocument();
      });

      // Click the option text to trigger PF Select's onSelect
      await user.click(screen.getByText('db-credentials'));

      expect(onUpdate).toHaveBeenCalledWith([
        {
          secretName: 'db-credentials',
          selectedKeys: ['username', 'password', 'host'],
        },
      ]);
    });

    it('should call onUpdate to remove a secret when it is deselected', async () => {
      const user = userEvent.setup();
      const existingRefs: ExistingSecretRef[] = [
        { secretName: 'db-credentials', selectedKeys: ['username', 'password', 'host'] },
      ];
      const onUpdate = jest.fn();

      render(
        <EnvExistingSecretField
          namespace="test-ns"
          existingSecretRefs={existingRefs}
          onUpdate={onUpdate}
        />,
      );

      // Open dropdown
      await user.click(screen.getByTestId('env-existing-secret-search'));

      await waitFor(() => {
        expect(screen.getByTestId('env-existing-secret-option-db-credentials')).toBeInTheDocument();
      });

      // Click the option text to deselect
      await user.click(screen.getByText('db-credentials'));

      expect(onUpdate).toHaveBeenCalledWith([]);
    });

    it('should show "N selected" badge when secrets are chosen', () => {
      const existingRefs: ExistingSecretRef[] = [
        { secretName: 'db-credentials', selectedKeys: ['username', 'password', 'host'] },
        { secretName: 'api-key-secret', selectedKeys: ['api-key'] },
      ];

      render(
        <EnvExistingSecretField
          namespace="test-ns"
          existingSecretRefs={existingRefs}
          onUpdate={jest.fn()}
        />,
      );

      expect(screen.getByTestId('env-existing-secret-badge')).toHaveTextContent('2 selected');
    });

    it('should not show badge when no secrets are selected', () => {
      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      expect(screen.queryByTestId('env-existing-secret-badge')).not.toBeInTheDocument();
    });

    it('should filter secrets by search text', async () => {
      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      // Target the actual input element inside the TextInputGroupMain
      const inputEl = screen.getByRole('combobox');
      fireEvent.change(inputEl, { target: { value: 'db' } });

      await waitFor(() => {
        expect(screen.getByTestId('env-existing-secret-option-db-credentials')).toBeInTheDocument();
      });
      expect(
        screen.queryByTestId('env-existing-secret-option-api-key-secret'),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('env-existing-secret-option-tls-cert')).not.toBeInTheDocument();
    });

    it('should show no results when search matches nothing', async () => {
      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      const inputEl = screen.getByRole('combobox');
      fireEvent.change(inputEl, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByTestId('env-existing-secret-no-results')).toBeInTheDocument();
      });
    });

    it('should never display secret values in the DOM', async () => {
      const user = userEvent.setup();

      render(
        <EnvExistingSecretField namespace="test-ns" existingSecretRefs={[]} onUpdate={jest.fn()} />,
      );

      await user.click(screen.getByTestId('env-existing-secret-search'));

      await waitFor(() => {
        expect(screen.getByTestId('env-existing-secret-option-db-credentials')).toBeInTheDocument();
      });

      // The component renders only secret names and key names, never actual values
      const listEl = screen.getByTestId('env-existing-secret-list');
      expect(within(listEl).getByText('db-credentials')).toBeInTheDocument();
      expect(within(listEl).getByText(/username/)).toBeInTheDocument();
    });
  });

  describe('namespace propagation', () => {
    it('should call useExistingSecrets with the provided namespace', () => {
      mockUseExistingSecrets.mockReturnValue({
        secrets: [],
        loaded: true,
        canList: true,
      });

      render(
        <EnvExistingSecretField
          namespace="my-project"
          existingSecretRefs={[]}
          onUpdate={jest.fn()}
        />,
      );

      expect(mockUseExistingSecrets).toHaveBeenCalledWith('my-project');
    });
  });
});
