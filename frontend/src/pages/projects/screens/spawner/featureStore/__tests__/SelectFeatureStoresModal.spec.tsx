import React, { act } from 'react';
import '@testing-library/jest-dom';
import { render, within } from '@testing-library/react';
import { SelectFeatureStoresModal } from '#~/pages/projects/screens/spawner/featureStore/SelectFeatureStoresModal';
import type { SelectedFeatureStoreConfig } from '#~/pages/projects/screens/spawner/featureStore/useWorkbenchFeatureStores';
import { FEATURE_STORE_UNAVAILABLE_TOOLTIP } from '#~/pages/projects/screens/spawner/featureStore/utils';

const mockFeatureStore = (
  overrides: Partial<SelectedFeatureStoreConfig> = {},
): SelectedFeatureStoreConfig => ({
  namespace: 'credit-namespace',
  configName: 'credit-scoring-local',
  projectName: 'credit_scoring_local',
  configMap: null,
  hasAccessToFeatureStore: true,
  permissions: ['Read'],
  ...overrides,
});

describe('SelectFeatureStoresModal', () => {
  it('should filter by availability and show the unavailable alert', async () => {
    const availableStore = mockFeatureStore();
    const unavailableStore = mockFeatureStore({
      namespace: '',
      configName: '',
      projectName: 'deleted_project',
      hasAccessToFeatureStore: false,
      permissions: [],
      isUnavailable: true,
    });

    const result = render(
      <SelectFeatureStoresModal
        featureStores={[availableStore]}
        unavailableFeatureStores={[unavailableStore]}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const modal = result.getByTestId('select-feature-stores-modal');
    expect(within(modal).getByTestId('feature-store-unavailable-alert')).toHaveTextContent(
      FEATURE_STORE_UNAVAILABLE_TOOLTIP,
    );
    expect(within(modal).getByRole('button', { name: 'All (2)' })).toBeInTheDocument();
    expect(
      within(modal).getByTestId('select-feature-stores-row-credit-namespace/credit_scoring_local'),
    ).toBeInTheDocument();
    expect(
      within(modal).getByTestId('select-feature-stores-row-/deleted_project'),
    ).toBeInTheDocument();

    await act(async () => {
      within(modal).getByRole('button', { name: 'Available (1)' }).click();
    });

    expect(
      within(modal).getByTestId('select-feature-stores-row-credit-namespace/credit_scoring_local'),
    ).toBeInTheDocument();
    expect(
      within(modal).queryByTestId('select-feature-stores-row-/deleted_project'),
    ).not.toBeInTheDocument();

    await act(async () => {
      within(modal).getByRole('button', { name: 'Unavailable (1)' }).click();
    });

    expect(
      within(modal).queryByTestId(
        'select-feature-stores-row-credit-namespace/credit_scoring_local',
      ),
    ).not.toBeInTheDocument();
    expect(
      within(modal).getByTestId('select-feature-stores-row-/deleted_project'),
    ).toBeInTheDocument();
  });
});
