import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExistingSecretMetadata, ExistingSecretRef } from '#~/pages/projects/types';
import ExistingSecretKeyPicker from '#~/src/pages/projects/screens/spawner/environmentVariables/ExistingSecretKeyPicker';

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
    const manyKeys = Array.from({ length: 12 }, (_, i) => `key-${i}`);
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
    const manyKeys = Array.from({ length: 12 }, (_, i) => `key-${i}`);
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
    fireEvent.change(filterInput, { target: { value: 'key-1' } });

    // Should show key-1, key-10, key-11 (matching 'key-1')
    expect(screen.getByTestId('key-checkbox-large-secret-key-1')).toBeInTheDocument();
    expect(screen.getByTestId('key-checkbox-large-secret-key-10')).toBeInTheDocument();
    expect(screen.getByTestId('key-checkbox-large-secret-key-11')).toBeInTheDocument();
    // key-2 should not be visible
    expect(screen.queryByTestId('key-checkbox-large-secret-key-2')).not.toBeInTheDocument();
  });

  it('should not render anything for a secret not in availableSecrets', () => {
    const selectedRefs: ExistingSecretRef[] = [
      { secretName: 'nonexistent-secret', selectedKeys: [] },
    ];
    const onUpdate = jest.fn();

    const { container } = render(
      <ExistingSecretKeyPicker
        selectedRefs={selectedRefs}
        availableSecrets={availableSecrets}
        onUpdate={onUpdate}
      />,
    );

    expect(
      container.querySelector('[data-testid="secret-key-section-nonexistent-secret"]'),
    ).not.toBeInTheDocument();
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
});
