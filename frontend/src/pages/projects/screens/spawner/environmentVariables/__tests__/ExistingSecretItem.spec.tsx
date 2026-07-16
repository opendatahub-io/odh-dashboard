import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExistingSecretItem from '#~/pages/projects/screens/spawner/environmentVariables/ExistingSecretItem';
import type { ExistingSecretRef } from '#~/pages/projects/types';

const createDefaultRef = (): ExistingSecretRef => ({
  secretName: 'my-secret',
  allKeys: true,
  selectedKeys: ['KEY_A', 'KEY_B'],
  availableKeys: ['KEY_A', 'KEY_B'],
});

describe('ExistingSecretItem', () => {
  it('should render secret name and key count', () => {
    const onUpdate = jest.fn();
    const onRemove = jest.fn();
    render(
      <ExistingSecretItem secretRef={createDefaultRef()} onUpdate={onUpdate} onRemove={onRemove} />,
    );
    expect(screen.getByTestId('existing-secret-item-my-secret')).toBeInTheDocument();
    expect(screen.getByText('my-secret')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 keys')).toBeInTheDocument();
  });

  it('should show danger alert for deleted secret', () => {
    const deletedRef: ExistingSecretRef = {
      secretName: 'gone-secret',
      allKeys: false,
      selectedKeys: ['KEY'],
      availableKeys: [],
      error: 'not-found',
    };
    render(<ExistingSecretItem secretRef={deletedRef} onUpdate={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByTestId('existing-secret-item-gone-secret')).toBeInTheDocument();
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it('should show warning for missing keys', () => {
    const missingRef: ExistingSecretRef = {
      secretName: 'changed-secret',
      allKeys: false,
      selectedKeys: ['STILL_HERE', 'GONE_KEY'],
      availableKeys: ['STILL_HERE', 'NEW_KEY'],
      missingKeys: ['GONE_KEY'],
    };
    render(<ExistingSecretItem secretRef={missingRef} onUpdate={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByText(/previously selected key/i)).toBeInTheDocument();
  });

  it('should call onRemove when remove link is clicked for deleted secret', () => {
    const onRemove = jest.fn();
    const deletedRef: ExistingSecretRef = {
      secretName: 'gone-secret',
      allKeys: false,
      selectedKeys: [],
      availableKeys: [],
      error: 'not-found',
    };
    render(<ExistingSecretItem secretRef={deletedRef} onUpdate={jest.fn()} onRemove={onRemove} />);
    const removeLink = screen.getByTestId('remove-missing-secret-gone-secret');
    fireEvent.click(removeLink);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('should call onUpdate with correct ref when a key checkbox is toggled off', () => {
    const onUpdate = jest.fn();
    const ref: ExistingSecretRef = {
      secretName: 'toggle-secret',
      allKeys: true,
      selectedKeys: ['KEY_A', 'KEY_B', 'KEY_C'],
      availableKeys: ['KEY_A', 'KEY_B', 'KEY_C'],
    };
    render(<ExistingSecretItem secretRef={ref} onUpdate={onUpdate} onRemove={jest.fn()} />);

    // Expand the section
    const expandButton = screen.getByTestId('existing-secret-expand-toggle-secret');
    fireEvent.click(expandButton);

    // Deselect KEY_B
    const keyBCheckbox = screen.getByTestId('secret-key-checkbox-toggle-secret-KEY_B');
    fireEvent.click(keyBCheckbox);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updatedRef = onUpdate.mock.calls[0][0] as ExistingSecretRef;
    expect(updatedRef.selectedKeys).toEqual(['KEY_A', 'KEY_C']);
    expect(updatedRef.allKeys).toBe(false);
  });
});
