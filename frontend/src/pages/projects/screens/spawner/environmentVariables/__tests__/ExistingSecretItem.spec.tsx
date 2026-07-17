import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExistingSecretRef } from '#~/pages/projects/types';
import ExistingSecretItem from '#~/pages/projects/screens/spawner/environmentVariables/ExistingSecretItem';

describe('ExistingSecretItem', () => {
  const defaultRef: ExistingSecretRef = {
    secretName: 'test-secret',
    selectedKeys: ['KEY_A', 'KEY_B'],
    allKeys: ['KEY_A', 'KEY_B', 'KEY_C'],
  };

  it('should render secret name and key count badge', () => {
    render(
      <ExistingSecretItem
        secretRef={defaultRef}
        secretStatus="loaded"
        onUpdateKeys={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.getByText('test-secret')).toBeInTheDocument();
    expect(screen.getByTestId('secret-key-badge-test-secret')).toHaveTextContent('2 of 3 keys');
  });

  it('should show danger alert for deleted secret', () => {
    render(
      <ExistingSecretItem
        secretRef={{ ...defaultRef, allKeys: [], selectedKeys: [] }}
        secretStatus="not-found"
        onUpdateKeys={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    // Expand the section to see the alert
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByTestId('secret-deleted-alert-test-secret')).toBeInTheDocument();
  });

  it('should call onRemove when remove reference button is clicked', () => {
    const onRemove = jest.fn();
    render(
      <ExistingSecretItem
        secretRef={{ ...defaultRef, allKeys: [], selectedKeys: [] }}
        secretStatus="not-found"
        onUpdateKeys={jest.fn()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByTestId('remove-secret-ref-test-secret'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('should show warning alert for missing keys', () => {
    const refWithMissing: ExistingSecretRef = {
      secretName: 'test-secret',
      selectedKeys: ['KEY_A', 'GONE_KEY'],
      allKeys: ['KEY_A', 'KEY_B'],
    };
    render(
      <ExistingSecretItem
        secretRef={refWithMissing}
        secretStatus="loaded"
        onUpdateKeys={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByTestId('secret-missing-keys-alert-test-secret')).toBeInTheDocument();
  });

  it('should toggle key selection', () => {
    const onUpdateKeys = jest.fn();
    render(
      <ExistingSecretItem
        secretRef={defaultRef}
        secretStatus="loaded"
        onUpdateKeys={onUpdateKeys}
        onRemove={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    // Deselect KEY_A
    fireEvent.click(screen.getByTestId('secret-key-checkbox-test-secret-KEY_A'));
    expect(onUpdateKeys).toHaveBeenCalledWith(['KEY_B']);
  });

  it('should deselect all keys', () => {
    const onUpdateKeys = jest.fn();
    render(
      <ExistingSecretItem
        secretRef={defaultRef}
        secretStatus="loaded"
        onUpdateKeys={onUpdateKeys}
        onRemove={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByTestId('deselect-all-keys-test-secret'));
    expect(onUpdateKeys).toHaveBeenCalledWith([]);
  });
});
