import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { ExistingSecretRef } from '#~/pages/projects/types';
import ExistingSecretField from '#~/pages/projects/screens/spawner/environmentVariables/ExistingSecretField';

// Mock MultiSelection to render simple checkboxes for testing key toggle logic
jest.mock('#~/components/MultiSelection', () => ({
  MultiSelection: () => <div data-testid="mock-multi-selection" />,
}));

const makeSecret = (name: string, keys: string[]): SecretKind =>
  ({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name, namespace: 'test-ns', annotations: {}, labels: {} },
    data: keys.reduce<Record<string, string>>((acc, key) => {
      acc[key] = 'dmFsdWU=';
      return acc;
    }, {}),
  } as unknown as SecretKind);

const availableSecrets = [makeSecret('db-secret', ['DB_HOST', 'DB_PORT', 'DB_USER'])];

describe('ExistingSecretField - key toggle logic', () => {
  it('should call onUpdate when unchecking one key from all-keys mode (produces selectedKeys with all other keys)', () => {
    const onUpdate = jest.fn();
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-secret', allKeys: true, selectedKeys: [] },
    ];

    render(
      <ExistingSecretField
        existingSecretRefs={refs}
        onUpdate={onUpdate}
        availableSecrets={availableSecrets}
        secretsLoaded
      />,
    );

    // Expand the secret section to see checkboxes
    const expandBtn = screen
      .getByTestId('existing-secret-expandable-db-secret')
      .querySelector('button');
    if (expandBtn) {
      fireEvent.click(expandBtn);
    }

    // Uncheck DB_HOST (should transition from allKeys to specific keys excluding DB_HOST)
    fireEvent.click(screen.getByTestId('secret-key-checkbox-db-secret-DB_HOST'));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updatedRefs = onUpdate.mock.calls[0][0] as ExistingSecretRef[];
    expect(updatedRefs).toHaveLength(1);
    expect(updatedRefs[0].allKeys).toBe(false);
    expect(updatedRefs[0].selectedKeys).toEqual(['DB_PORT', 'DB_USER']);
  });

  it('should flip allKeys to true when all keys are checked back', () => {
    const onUpdate = jest.fn();
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-secret', allKeys: false, selectedKeys: ['DB_HOST', 'DB_PORT'] },
    ];

    render(
      <ExistingSecretField
        existingSecretRefs={refs}
        onUpdate={onUpdate}
        availableSecrets={availableSecrets}
        secretsLoaded
      />,
    );

    // Expand the secret section
    const expandBtn = screen
      .getByTestId('existing-secret-expandable-db-secret')
      .querySelector('button');
    if (expandBtn) {
      fireEvent.click(expandBtn);
    }

    // Check the missing key DB_USER to complete all keys
    fireEvent.click(screen.getByTestId('secret-key-checkbox-db-secret-DB_USER'));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updatedRefs = onUpdate.mock.calls[0][0] as ExistingSecretRef[];
    expect(updatedRefs[0].allKeys).toBe(true);
    expect(updatedRefs[0].selectedKeys).toEqual([]);
  });

  it('should produce empty selectedKeys on deselect-all', () => {
    const onUpdate = jest.fn();
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-secret', allKeys: true, selectedKeys: [] },
    ];

    render(
      <ExistingSecretField
        existingSecretRefs={refs}
        onUpdate={onUpdate}
        availableSecrets={availableSecrets}
        secretsLoaded
      />,
    );

    // Expand the secret section
    const expandBtn = screen
      .getByTestId('existing-secret-expandable-db-secret')
      .querySelector('button');
    if (expandBtn) {
      fireEvent.click(expandBtn);
    }

    // Click deselect all
    fireEvent.click(screen.getByTestId('deselect-all-keys-db-secret'));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updatedRefs = onUpdate.mock.calls[0][0] as ExistingSecretRef[];
    expect(updatedRefs[0].allKeys).toBe(false);
    expect(updatedRefs[0].selectedKeys).toEqual([]);
  });

  it('should show error helper text when no keys are selected after deselect-all', () => {
    const refs: ExistingSecretRef[] = [
      { secretName: 'db-secret', allKeys: false, selectedKeys: [] },
    ];

    render(
      <ExistingSecretField
        existingSecretRefs={refs}
        onUpdate={jest.fn()}
        availableSecrets={availableSecrets}
        secretsLoaded
      />,
    );

    // Expand the secret section
    const expandBtn = screen
      .getByTestId('existing-secret-expandable-db-secret')
      .querySelector('button');
    if (expandBtn) {
      fireEvent.click(expandBtn);
    }

    expect(screen.getByTestId('no-keys-selected-db-secret')).toHaveTextContent(
      'Select at least one key',
    );
  });
});
