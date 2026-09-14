import * as React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExistingSecretRef, ExistingSecretMetadata } from '#~/pages/projects/types';
import EnvExistingSecretField from '#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecretField';
import { UseExistingSecretsResult } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

const mockSecrets: ExistingSecretMetadata[] = [
  { name: 'db-credentials', keys: ['username', 'password', 'host'] },
  { name: 'api-key-secret', keys: ['api-key'] },
  { name: 'tls-cert', keys: ['cert', 'key'] },
];

const mockExistingSecretsData = (
  overrides: Partial<UseExistingSecretsResult> = {},
): UseExistingSecretsResult => ({
  secrets: mockSecrets,
  loaded: true,
  canList: true,
  ...overrides,
});

describe('EnvExistingSecretField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with available secrets', () => {
    const loadedSecretsData = mockExistingSecretsData();

    it('should render the dropdown toggle', () => {
      render(
        <EnvExistingSecretField
          existingSecretRefs={[]}
          onUpdate={jest.fn()}
          existingSecretsData={loadedSecretsData}
        />,
      );

      expect(screen.getByTestId('env-existing-secret-toggle')).toBeInTheDocument();
    });

    it('should show search input with placeholder', () => {
      render(
        <EnvExistingSecretField
          existingSecretRefs={[]}
          onUpdate={jest.fn()}
          existingSecretsData={loadedSecretsData}
        />,
      );

      expect(screen.getByTestId('env-existing-secret-search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Select secrets')).toBeInTheDocument();
    });

    it('should show secret options when dropdown is opened', async () => {
      const user = userEvent.setup();
      render(
        <EnvExistingSecretField
          existingSecretRefs={[]}
          onUpdate={jest.fn()}
          existingSecretsData={loadedSecretsData}
        />,
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
        <EnvExistingSecretField
          existingSecretRefs={[]}
          onUpdate={jest.fn()}
          existingSecretsData={loadedSecretsData}
        />,
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
        <EnvExistingSecretField
          existingSecretRefs={[]}
          onUpdate={onUpdate}
          existingSecretsData={loadedSecretsData}
        />,
      );

      await user.click(screen.getByTestId('env-existing-secret-search'));

      await waitFor(() => {
        expect(screen.getByTestId('env-existing-secret-option-db-credentials')).toBeInTheDocument();
      });

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
          existingSecretRefs={existingRefs}
          onUpdate={onUpdate}
          existingSecretsData={loadedSecretsData}
        />,
      );

      await user.click(screen.getByTestId('env-existing-secret-search'));

      await waitFor(() => {
        expect(screen.getByTestId('env-existing-secret-option-db-credentials')).toBeInTheDocument();
      });

      const option = screen.getByTestId('env-existing-secret-option-db-credentials');
      await user.click(within(option).getByText('db-credentials'));

      expect(onUpdate).toHaveBeenCalledWith([]);
    });

    it('should show "N selected" badge when secrets are chosen', () => {
      const existingRefs: ExistingSecretRef[] = [
        { secretName: 'db-credentials', selectedKeys: ['username', 'password', 'host'] },
        { secretName: 'api-key-secret', selectedKeys: ['api-key'] },
      ];

      render(
        <EnvExistingSecretField
          existingSecretRefs={existingRefs}
          onUpdate={jest.fn()}
          existingSecretsData={loadedSecretsData}
        />,
      );

      expect(screen.getByTestId('env-existing-secret-badge')).toHaveTextContent('2 selected');
    });

    it('should not show badge when no secrets are selected', () => {
      render(
        <EnvExistingSecretField
          existingSecretRefs={[]}
          onUpdate={jest.fn()}
          existingSecretsData={loadedSecretsData}
        />,
      );

      expect(screen.queryByTestId('env-existing-secret-badge')).not.toBeInTheDocument();
    });

    it('should filter secrets by search text', async () => {
      render(
        <EnvExistingSecretField
          existingSecretRefs={[]}
          onUpdate={jest.fn()}
          existingSecretsData={loadedSecretsData}
        />,
      );

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
        <EnvExistingSecretField
          existingSecretRefs={[]}
          onUpdate={jest.fn()}
          existingSecretsData={loadedSecretsData}
        />,
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
        <EnvExistingSecretField
          existingSecretRefs={[]}
          onUpdate={jest.fn()}
          existingSecretsData={loadedSecretsData}
        />,
      );

      await user.click(screen.getByTestId('env-existing-secret-search'));

      await waitFor(() => {
        expect(screen.getByTestId('env-existing-secret-option-db-credentials')).toBeInTheDocument();
      });

      const listEl = screen.getByTestId('env-existing-secret-list');
      expect(within(listEl).getByText('db-credentials')).toBeInTheDocument();
      expect(within(listEl).getByText(/username/)).toBeInTheDocument();
    });
  });

  describe('collision warning', () => {
    it('should not show collision warning when no collisions exist', () => {
      const existingRefs: ExistingSecretRef[] = [
        { secretName: 'db-credentials', selectedKeys: ['username'] },
        { secretName: 'api-key-secret', selectedKeys: ['api-key'] },
      ];

      render(
        <EnvExistingSecretField
          existingSecretRefs={existingRefs}
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData()}
        />,
      );

      expect(screen.queryByTestId('env-collision-warning')).not.toBeInTheDocument();
    });

    it('should show singular collision warning for one key collision', () => {
      const collidingSecrets: ExistingSecretMetadata[] = [
        { name: 'secret-a', keys: ['SHARED_KEY', 'key-a'] },
        { name: 'secret-b', keys: ['SHARED_KEY', 'key-b'] },
      ];
      const existingRefs: ExistingSecretRef[] = [
        { secretName: 'secret-a', selectedKeys: ['SHARED_KEY', 'key-a'] },
        { secretName: 'secret-b', selectedKeys: ['SHARED_KEY', 'key-b'] },
      ];

      render(
        <EnvExistingSecretField
          existingSecretRefs={existingRefs}
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ secrets: collidingSecrets })}
        />,
      );

      const alert = screen.getByTestId('env-collision-warning');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Resolve key name collisions');
      expect(alert).toHaveTextContent(
        'The following keys are defined more than once across the selected secrets.',
      );
      expect(alert).toHaveTextContent('Defined in secrets: secret-a, secret-b');
      expect(within(alert).getByText('secret-a, secret-b').tagName).toBe('STRONG');
    });

    it('should show plural collision warning for multiple key collisions', () => {
      const collidingSecrets: ExistingSecretMetadata[] = [
        { name: 'secret-a', keys: ['KEY_1', 'KEY_2', 'unique-a'] },
        { name: 'secret-b', keys: ['KEY_1', 'KEY_2', 'unique-b'] },
      ];
      const existingRefs: ExistingSecretRef[] = [
        { secretName: 'secret-a', selectedKeys: ['KEY_1', 'KEY_2', 'unique-a'] },
        { secretName: 'secret-b', selectedKeys: ['KEY_1', 'KEY_2', 'unique-b'] },
      ];

      render(
        <EnvExistingSecretField
          existingSecretRefs={existingRefs}
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ secrets: collidingSecrets })}
        />,
      );

      const alert = screen.getByTestId('env-collision-warning');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Resolve key name collisions');
      expect(alert).toHaveTextContent('Defined in secrets: secret-a, secret-b');
      expect(alert).toHaveTextContent('KEY_1');
      expect(alert).toHaveTextContent('KEY_2');
    });

    it('should not show collision warning when only one secret is selected', () => {
      const existingRefs: ExistingSecretRef[] = [
        { secretName: 'db-credentials', selectedKeys: ['username', 'password', 'host'] },
      ];

      render(
        <EnvExistingSecretField
          existingSecretRefs={existingRefs}
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData()}
        />,
      );

      expect(screen.queryByTestId('env-collision-warning')).not.toBeInTheDocument();
    });

    it('should not show collision warning when only reserved keys overlap', () => {
      const collidingSecrets: ExistingSecretMetadata[] = [
        { name: 'secret-a', keys: ['TOKEN_VALUE', 'NOTEBOOK_ARGS'] },
        { name: 'secret-b', keys: ['NOTEBOOK_ARGS'] },
      ];
      const existingRefs: ExistingSecretRef[] = [
        { secretName: 'secret-a', selectedKeys: ['TOKEN_VALUE', 'NOTEBOOK_ARGS'] },
        { secretName: 'secret-b', selectedKeys: ['NOTEBOOK_ARGS'] },
      ];

      render(
        <EnvExistingSecretField
          existingSecretRefs={existingRefs}
          onUpdate={jest.fn()}
          existingSecretsData={mockExistingSecretsData({ secrets: collidingSecrets })}
        />,
      );

      expect(screen.queryByTestId('env-collision-warning')).not.toBeInTheDocument();
    });
  });
});
