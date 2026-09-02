import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ExistingSecretMetadata, ExistingSecretRef } from '#~/pages/projects/types';
import ExistingSecretKeyPicker from '#~/pages/projects/screens/spawner/environmentVariables/ExistingSecretKeyPicker';

describe('ExistingSecretKeyPicker', () => {
  const availableSecrets: ExistingSecretMetadata[] = [
    { name: 'db-secret', keys: ['username', 'password', 'host'] },
    { name: 'api-secret', keys: ['api-key', 'api-url'] },
  ];

  const expandSection = (secretName: string) => {
    const section = screen.getByTestId(`expandable-section-${secretName}`);
    const button = section.querySelector('button');
    if (button) {
      fireEvent.click(button);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render expandable sections for each selected secret', () => {
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
      { secretName: 'api-secret', selectedKeys: ['api-key', 'api-url'] },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByTestId('secret-key-section-db-secret')).toBeInTheDocument();
    expect(screen.getByTestId('secret-key-section-api-secret')).toBeInTheDocument();
  });

  it('should show correct "N of M keys" badge', () => {
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'db-secret', selectedKeys: ['username'] },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByTestId('key-count-badge-db-secret')).toHaveTextContent('1 of 3 keys');
  });

  it('should show all keys badge when all are selected', () => {
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByTestId('key-count-badge-db-secret')).toHaveTextContent('3 of 3 keys');
  });

  it('should toggle select all to deselect all when all keys are selected', () => {
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expandSection('db-secret');
    fireEvent.click(screen.getByTestId('toggle-select-all-db-secret'));

    expect(onUpdate).toHaveBeenCalledWith([{ secretName: 'db-secret', selectedKeys: [] }]);
  });

  it('should toggle select all to select all when not all keys are selected', () => {
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'db-secret', selectedKeys: ['username'] },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expandSection('db-secret');
    fireEvent.click(screen.getByTestId('toggle-select-all-db-secret'));

    expect(onUpdate).toHaveBeenCalledWith([
      { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
    ]);
  });

  it('should toggle individual key selection', () => {
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'db-secret', selectedKeys: ['username'] },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expandSection('db-secret');
    fireEvent.click(screen.getByTestId('key-checkbox-db-secret-password'));

    expect(onUpdate).toHaveBeenCalledWith([
      { secretName: 'db-secret', selectedKeys: ['username', 'password'] },
    ]);
  });

  it('should uncheck an individual key', () => {
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'db-secret', selectedKeys: ['username', 'password'] },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expandSection('db-secret');
    fireEvent.click(screen.getByTestId('key-checkbox-db-secret-username'));

    expect(onUpdate).toHaveBeenCalledWith([
      { secretName: 'db-secret', selectedKeys: ['password'] },
    ]);
  });

  it('should not show filter input when secret has 10 or fewer keys', () => {
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expandSection('db-secret');

    expect(screen.queryByTestId('key-filter-db-secret')).not.toBeInTheDocument();
  });

  it('should show filter input when secret has more than 10 keys', () => {
    const manyKeys = Array.from({ length: 12 }, (_, i) => `KEY_${i}`);
    const largeSecret: ExistingSecretMetadata[] = [{ name: 'large-secret', keys: manyKeys }];
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'large-secret', selectedKeys: manyKeys },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={largeSecret}
        onUpdate={onUpdate}
      />,
    );

    expandSection('large-secret');

    expect(screen.getByTestId('key-filter-large-secret')).toBeInTheDocument();
  });

  it('should filter visible keys when filter is typed', () => {
    const manyKeys = Array.from({ length: 12 }, (_, i) => `KEY_${i}`);
    const largeSecret: ExistingSecretMetadata[] = [{ name: 'large-secret', keys: manyKeys }];
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'large-secret', selectedKeys: manyKeys },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={largeSecret}
        onUpdate={onUpdate}
      />,
    );

    expandSection('large-secret');

    const filterInput = screen.getByTestId('key-filter-large-secret');
    fireEvent.change(filterInput, { target: { value: 'KEY_1' } });

    // Should show KEY_1, KEY_10, KEY_11 (matching 'KEY_1')
    expect(screen.getByTestId('key-checkbox-large-secret-KEY_1')).toBeInTheDocument();
    expect(screen.getByTestId('key-checkbox-large-secret-KEY_10')).toBeInTheDocument();
    expect(screen.getByTestId('key-checkbox-large-secret-KEY_11')).toBeInTheDocument();
    // KEY_2 should not be visible
    expect(screen.queryByTestId('key-checkbox-large-secret-KEY_2')).not.toBeInTheDocument();
  });

  it('should show deleted secret alert for a secret not in availableSecrets', () => {
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'nonexistent-secret', selectedKeys: [] },
    ];
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByTestId('secret-key-section-nonexistent-secret')).toBeInTheDocument();
    expect(screen.getByTestId('env-deleted-secret-alert-nonexistent-secret')).toBeInTheDocument();
  });

  it('should render nothing when no selectedRefs', () => {
    const onUpdate = jest.fn();

    render(
      <ExistingSecretKeyPicker
        selectedRefs={[]}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.queryByTestId('secret-key-section-db-secret')).not.toBeInTheDocument();
    expect(screen.queryByTestId('secret-key-section-api-secret')).not.toBeInTheDocument();
  });

  describe('deleted secret detection', () => {
    it('should show danger alert when a referenced secret is not in availableSecrets', () => {
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'deleted-secret', selectedKeys: ['old-key'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={availableSecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.getByTestId('secret-key-section-deleted-secret')).toBeInTheDocument();
      expect(screen.getByTestId('env-deleted-secret-alert-deleted-secret')).toBeInTheDocument();
      expect(screen.getByTestId('deleted-icon-deleted-secret')).toBeInTheDocument();
    });

    it('should not show key count badge for deleted secret', () => {
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'deleted-secret', selectedKeys: ['old-key'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={availableSecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.queryByTestId('key-count-badge-deleted-secret')).not.toBeInTheDocument();
    });

    it('should remove the deleted ref when "Remove this reference" is clicked', () => {
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'deleted-secret', selectedKeys: ['old-key'] },
        { secretName: 'db-secret', selectedKeys: ['username'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={availableSecrets}
          onUpdate={onUpdate}
        />,
      );

      fireEvent.click(screen.getByTestId('remove-deleted-ref-deleted-secret'));

      expect(onUpdate).toHaveBeenCalledWith([
        { secretName: 'db-secret', selectedKeys: ['username'] },
      ]);
    });
  });

  describe('missing keys detection', () => {
    it('should show warning alert when selected keys are not in the secret', () => {
      const secretsWithFewerKeys: ExistingSecretMetadata[] = [
        { name: 'db-secret', keys: ['username', 'host'] },
      ];
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={secretsWithFewerKeys}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.getByTestId('env-missing-keys-alert-db-secret')).toBeInTheDocument();
      expect(screen.getByTestId('missing-keys-icon-db-secret')).toBeInTheDocument();
    });

    it('should show singular message for one missing key', () => {
      const secretsWithFewerKeys: ExistingSecretMetadata[] = [
        { name: 'db-secret', keys: ['username', 'host'] },
      ];
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={secretsWithFewerKeys}
          onUpdate={onUpdate}
        />,
      );

      const alert = screen.getByTestId('env-missing-keys-alert-db-secret');
      expect(alert).toHaveTextContent('1 previously selected key was not found in this secret');
      expect(alert).toHaveTextContent(
        'Missing: password. Key no longer exists. To continue, remove it.',
      );
    });

    it('should show plural message for multiple missing keys', () => {
      const secretsWithFewerKeys: ExistingSecretMetadata[] = [
        { name: 'db-secret', keys: ['host'] },
      ];
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={secretsWithFewerKeys}
          onUpdate={onUpdate}
        />,
      );

      const alert = screen.getByTestId('env-missing-keys-alert-db-secret');
      expect(alert).toHaveTextContent('2 previously selected keys were not found in this secret');
      expect(alert).toHaveTextContent(
        'Missing: username, password. Keys no longer exist. To continue, remove them.',
      );
    });

    it('should remove missing keys when "Remove missing keys" is clicked', () => {
      const secretsWithFewerKeys: ExistingSecretMetadata[] = [
        { name: 'db-secret', keys: ['username', 'host'] },
      ];
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={secretsWithFewerKeys}
          onUpdate={onUpdate}
        />,
      );

      fireEvent.click(screen.getByTestId('remove-missing-keys-db-secret'));

      expect(onUpdate).toHaveBeenCalledWith([
        { secretName: 'db-secret', selectedKeys: ['username', 'host'] },
      ]);
    });

    it('should not show missing keys warning when all selected keys exist', () => {
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'db-secret', selectedKeys: ['username', 'password'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={availableSecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.queryByTestId('env-missing-keys-alert-db-secret')).not.toBeInTheDocument();
      expect(screen.queryByTestId('missing-keys-icon-db-secret')).not.toBeInTheDocument();
    });
  });

  describe('empty secret detection', () => {
    it('should show warning alert when a secret has no keys', () => {
      const emptySecrets: ExistingSecretMetadata[] = [{ name: 'empty-secret', keys: [] }];
      const selectedRefs: ExistingSecretRef[] = [{ secretName: 'empty-secret', selectedKeys: [] }];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={emptySecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.getByTestId('secret-key-section-empty-secret')).toBeInTheDocument();
      expect(screen.getByTestId('env-empty-secret-alert-empty-secret')).toBeInTheDocument();
      expect(screen.getByTestId('empty-secret-icon-empty-secret')).toBeInTheDocument();
    });

    it('should show empty secret message without a remove action', () => {
      const emptySecrets: ExistingSecretMetadata[] = [{ name: 'empty-secret', keys: [] }];
      const selectedRefs: ExistingSecretRef[] = [{ secretName: 'empty-secret', selectedKeys: [] }];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={emptySecrets}
          onUpdate={onUpdate}
        />,
      );

      const alert = screen.getByTestId('env-empty-secret-alert-empty-secret');
      expect(alert).toHaveTextContent('This secret has no keys.');
      expect(alert).toHaveTextContent(
        'No environment variables will be set from this secret. If this is unexpected, contact your administrator.',
      );
      expect(screen.queryByTestId('remove-deleted-ref-empty-secret')).not.toBeInTheDocument();
      expect(screen.queryByTestId('remove-unavailable-ref-empty-secret')).not.toBeInTheDocument();
    });

    it('should not show key count badge for empty secret', () => {
      const emptySecrets: ExistingSecretMetadata[] = [{ name: 'empty-secret', keys: [] }];
      const selectedRefs: ExistingSecretRef[] = [{ secretName: 'empty-secret', selectedKeys: [] }];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={emptySecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.queryByTestId('key-count-badge-empty-secret')).not.toBeInTheDocument();
    });

    it('should prefer empty secret alert over missing keys when secret has no keys', () => {
      const emptySecrets: ExistingSecretMetadata[] = [{ name: 'empty-secret', keys: [] }];
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'empty-secret', selectedKeys: ['stale-key'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={emptySecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.getByTestId('env-empty-secret-alert-empty-secret')).toBeInTheDocument();
      expect(screen.queryByTestId('env-missing-keys-alert-empty-secret')).not.toBeInTheDocument();
      expect(screen.queryByTestId('missing-keys-icon-empty-secret')).not.toBeInTheDocument();
    });
  });

  describe('expandable section auto-expand', () => {
    it('should expand when a secret becomes all-keys-unavailable after mount', () => {
      const usableSecrets: ExistingSecretMetadata[] = [{ name: 'bad-secret', keys: ['username'] }];
      const unavailableSecrets: ExistingSecretMetadata[] = [
        { name: 'bad-secret', keys: ['NOTEBOOK_ARGS', 'JUPYTER_IMAGE'] },
      ];
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'bad-secret', selectedKeys: ['username'] },
      ];
      const onUpdate = jest.fn();

      const { rerender } = render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={usableSecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.queryByTestId('env-all-unavailable-alert-bad-secret')).not.toBeInTheDocument();

      rerender(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={unavailableSecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.getByTestId('env-all-unavailable-alert-bad-secret')).toBeVisible();
      expect(screen.getByTestId('remove-unavailable-ref-bad-secret')).toBeVisible();
    });
  });

  describe('all keys unavailable', () => {
    const unavailableSecrets: ExistingSecretMetadata[] = [
      { name: 'bad-secret', keys: ['NOTEBOOK_ARGS', 'JUPYTER_IMAGE'] },
    ];
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'bad-secret', selectedKeys: ['NOTEBOOK_ARGS', 'JUPYTER_IMAGE'] },
    ];

    it('should show danger alert with correct title text', () => {
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={unavailableSecrets}
          onUpdate={onUpdate}
        />,
      );

      const alert = screen.getByTestId('env-all-unavailable-alert-bad-secret');
      expect(alert).toBeVisible();
      expect(alert).toHaveTextContent(
        'None of the keys in this secret can be used as environment variables. To continue, remove it.',
      );
    });

    it('should show unavailable-icon in the section header', () => {
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={unavailableSecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.getByTestId('unavailable-icon-bad-secret')).toBeInTheDocument();
    });

    it('should not show key count badge', () => {
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={unavailableSecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.queryByTestId('key-count-badge-bad-secret')).not.toBeInTheDocument();
    });

    it('should remove the ref when "Remove secret" is clicked', () => {
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={[...selectedRefs, { secretName: 'db-secret', selectedKeys: ['username'] }]}
          availableSecrets={[...unavailableSecrets, ...availableSecrets]}
          onUpdate={onUpdate}
        />,
      );

      fireEvent.click(screen.getByTestId('remove-unavailable-ref-bad-secret'));

      expect(onUpdate).toHaveBeenCalledWith([
        { secretName: 'db-secret', selectedKeys: ['username'] },
      ]);
    });
  });

  describe('some keys unavailable', () => {
    it('should show warning alert when secret has a mix of valid and invalid keys', () => {
      const mixedSecrets: ExistingSecretMetadata[] = [
        { name: 'mixed-secret', keys: ['VALID_KEY', 'key-with-hyphens', 'ANOTHER_VALID'] },
      ];
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'mixed-secret', selectedKeys: ['VALID_KEY', 'ANOTHER_VALID'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={mixedSecrets}
          onUpdate={onUpdate}
        />,
      );

      expandSection('mixed-secret');

      const alert = screen.getByTestId('env-unavailable-keys-alert-mixed-secret');
      expect(alert).toBeVisible();
      expect(alert).toHaveTextContent(
        '1 key in this secret cannot be used as environment variables',
      );
      expect(alert).toHaveTextContent('Unavailable: key-with-hyphens');
      expect(within(alert).getByText('key-with-hyphens').tagName).toBe('STRONG');
    });

    it('should show plural message for multiple unavailable keys', () => {
      const mixedSecrets: ExistingSecretMetadata[] = [
        { name: 'mixed-secret', keys: ['VALID_KEY', 'key-with-hyphens', '123-bad'] },
      ];
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'mixed-secret', selectedKeys: ['VALID_KEY'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={mixedSecrets}
          onUpdate={onUpdate}
        />,
      );

      const alert = screen.getByTestId('env-unavailable-keys-alert-mixed-secret');
      expect(alert).toHaveTextContent(
        '2 keys in this secret cannot be used as environment variables',
      );
      expect(alert).toHaveTextContent('Unavailable: key-with-hyphens, 123-bad');
    });

    it('should suppress unavailable warning when hasMissingKeys is true', () => {
      const mixedSecrets: ExistingSecretMetadata[] = [
        { name: 'mixed-secret', keys: ['VALID_KEY', 'key-with-hyphens'] },
      ];
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'mixed-secret', selectedKeys: ['VALID_KEY', 'gone-key'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={mixedSecrets}
          onUpdate={onUpdate}
        />,
      );

      expect(
        screen.queryByTestId('env-unavailable-keys-alert-mixed-secret'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('env-missing-keys-alert-mixed-secret')).toBeInTheDocument();
    });
  });

  describe('collision icons', () => {
    it('should show collision warning icon on colliding keys', () => {
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
      ];
      const onUpdate = jest.fn();
      const collidingKeys = new Set(['username']);

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={availableSecrets}
          onUpdate={onUpdate}
          collidingKeys={collidingKeys}
        />,
      );

      expandSection('db-secret');

      expect(screen.getByTestId('collision-icon-db-secret-username')).toBeInTheDocument();
      expect(screen.queryByTestId('collision-icon-db-secret-password')).not.toBeInTheDocument();
      expect(screen.queryByTestId('collision-icon-db-secret-host')).not.toBeInTheDocument();
    });

    it('should not show collision icons when collidingKeys is not provided', () => {
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'db-secret', selectedKeys: ['username', 'password', 'host'] },
      ];
      const onUpdate = jest.fn();

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={availableSecrets}
          onUpdate={onUpdate}
        />,
      );

      expandSection('db-secret');

      expect(screen.queryByTestId('collision-icon-db-secret-username')).not.toBeInTheDocument();
    });

    it('should not show collision icon on reserved keys', () => {
      const mixedSecrets: ExistingSecretMetadata[] = [
        { name: 'mixed-reserved-keys', keys: ['NOTEBOOK_ARGS', 'TOKEN_VALUE'] },
      ];
      const selectedRefs: ExistingSecretRef[] = [
        { secretName: 'mixed-reserved-keys', selectedKeys: ['TOKEN_VALUE'] },
      ];
      const collidingKeys = new Set(['NOTEBOOK_ARGS', 'TOKEN_VALUE']);

      render(
        <ExistingSecretKeyPicker
          selectedRefs={selectedRefs}
          availableSecrets={mixedSecrets}
          onUpdate={jest.fn()}
          collidingKeys={collidingKeys}
        />,
      );

      expect(
        screen.queryByTestId('collision-icon-mixed-reserved-keys-NOTEBOOK_ARGS'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('collision-icon-mixed-reserved-keys-TOKEN_VALUE'),
      ).toBeInTheDocument();
    });
  });
});
