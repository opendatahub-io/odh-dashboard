import React, { act } from 'react';
import '@testing-library/jest-dom';
import { render, within } from '@testing-library/react';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { FeatureStoreFormSection } from '#~/pages/projects/screens/spawner/featureStore/FeatureStoreFormSection';
import type {
  WorkbenchFeatureStoreConfig,
  SelectedFeatureStoreConfig,
} from '#~/pages/projects/screens/spawner/featureStore/useWorkbenchFeatureStores';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  SupportedArea: { FEATURE_STORE: 'feature-store' },
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/spawner/featureStore/SelectFeatureStoresModal', () => ({
  SelectFeatureStoresModal: ({
    featureStores,
    unavailableFeatureStores = [],
    onClose,
    onSave,
  }: {
    featureStores: WorkbenchFeatureStoreConfig[];
    unavailableFeatureStores?: SelectedFeatureStoreConfig[];
    onClose: () => void;
    onSave: (featureStores: SelectedFeatureStoreConfig[]) => void;
  }) => (
    <div data-testid="select-feature-stores-modal">
      <span data-testid="modal-feature-store-count">{featureStores.length}</span>
      <span data-testid="modal-unavailable-feature-store-count">
        {unavailableFeatureStores.length}
      </span>
      <button type="button" onClick={() => onSave(featureStores.slice(0, 1))}>
        Connect first
      </button>
      <button type="button" onClick={onClose}>
        Close modal
      </button>
    </div>
  ),
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

const mockFeatureStore = (
  overrides: Partial<SelectedFeatureStoreConfig> = {},
): SelectedFeatureStoreConfig => ({
  namespace: 'credit-namespace',
  configName: 'credit-scoring-local',
  projectName: 'credit_scoring_local',
  configMap: null,
  hasAccessToFeatureStore: true,
  permissionLevel: ['Read'],
  ...overrides,
});

describe('FeatureStoreFormSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAreaAvailable.mockReturnValue({ status: true } as ReturnType<
      typeof useIsAreaAvailable
    >);
  });

  it('should render nothing when the Feast operator is unavailable', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: false } as ReturnType<
      typeof useIsAreaAvailable
    >);

    const result = render(
      <FeatureStoreFormSection
        loaded
        availableFeatureStores={[mockFeatureStore()]}
        onSelect={jest.fn()}
      />,
    );

    expect(result.queryByTestId('feature-store-section')).not.toBeInTheDocument();
  });

  it('should show a loading skeleton while feature stores are loading', () => {
    const result = render(
      <FeatureStoreFormSection loaded={false} availableFeatureStores={[]} onSelect={jest.fn()} />,
    );

    expect(result.getByTestId('skeleton-loader')).toBeInTheDocument();
    expect(result.queryByTestId('select-feature-store-button')).not.toBeInTheDocument();
  });

  it('should show an error state when loading fails', () => {
    const result = render(
      <FeatureStoreFormSection
        loaded={false}
        error={new Error('Failed to load feature stores')}
        availableFeatureStores={[]}
        onSelect={jest.fn()}
      />,
    );

    expect(result.getByTestId('error-content')).toBeInTheDocument();
    expect(result.getByText('Could not load required data')).toBeInTheDocument();
    expect(result.queryByTestId('select-feature-store-button')).not.toBeInTheDocument();
  });

  it('should render the empty state when no feature stores are selected', () => {
    const result = render(
      <FeatureStoreFormSection
        loaded
        availableFeatureStores={[mockFeatureStore()]}
        onSelect={jest.fn()}
      />,
    );

    expect(result.getByTestId('feature-store-empty-state')).toBeInTheDocument();
    expect(result.getByRole('button', { name: 'Select feature store' })).toBeEnabled();
  });

  it('should disable the select button with a tooltip when no stores are available', () => {
    const result = render(
      <FeatureStoreFormSection loaded availableFeatureStores={[]} onSelect={jest.fn()} />,
    );

    const selectButton = result.getByTestId('select-feature-store-button');
    expect(selectButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should render the connected table and example code for selected stores', () => {
    const result = render(
      <FeatureStoreFormSection
        loaded
        availableFeatureStores={[mockFeatureStore()]}
        selectedFeatureStores={[mockFeatureStore()]}
        onSelect={jest.fn()}
      />,
    );

    expect(result.getByTestId('feature-store-connected-table')).toBeInTheDocument();
    expect(result.getByTestId('feature-store-code-block')).toBeInTheDocument();
    expect(result.queryByTestId('feature-store-empty-state')).not.toBeInTheDocument();
  });

  it('should open the modal with available feature stores from the parent', async () => {
    const availableFeatureStores = [
      mockFeatureStore(),
      mockFeatureStore({
        namespace: 'test-feast-banking',
        configName: 'banking',
        projectName: 'banking',
      }),
    ];

    const result = render(
      <FeatureStoreFormSection
        loaded
        availableFeatureStores={availableFeatureStores}
        onSelect={jest.fn()}
      />,
    );

    await act(async () => {
      result.getByRole('button', { name: 'Select feature store' }).click();
    });

    const modal = result.getByTestId('select-feature-stores-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByTestId('modal-feature-store-count')).toHaveTextContent('2');
  });

  it('should pass unavailable feature stores to the selection modal', async () => {
    const unavailableStore = mockFeatureStore({
      namespace: '',
      configName: '',
      projectName: 'deleted_project',
      hasAccessToFeatureStore: false,
      permissionLevel: [],
      isUnavailable: true,
    });
    const availableStore = mockFeatureStore();

    const result = render(
      <FeatureStoreFormSection
        loaded
        availableFeatureStores={[availableStore]}
        selectedFeatureStores={[availableStore, unavailableStore]}
        onSelect={jest.fn()}
      />,
    );

    await act(async () => {
      result.getByRole('button', { name: 'Select feature store' }).click();
    });

    const modal = result.getByTestId('select-feature-stores-modal');
    expect(within(modal).getByTestId('modal-unavailable-feature-store-count')).toHaveTextContent(
      '1',
    );
  });

  it('should apply modal selections via onSelect', async () => {
    const onSelect = jest.fn();
    const selectedFeatureStores = [mockFeatureStore()];
    const availableFeatureStores = [
      mockFeatureStore(),
      mockFeatureStore({
        namespace: 'test-feast-banking',
        configName: 'banking',
        projectName: 'banking',
      }),
    ];

    const result = render(
      <FeatureStoreFormSection
        loaded
        availableFeatureStores={availableFeatureStores}
        selectedFeatureStores={selectedFeatureStores}
        onSelect={onSelect}
      />,
    );

    await act(async () => {
      result.getByRole('button', { name: 'Select feature store' }).click();
    });
    await act(async () => {
      result.getByRole('button', { name: 'Connect first' }).click();
    });

    expect(onSelect).toHaveBeenCalledWith([availableFeatureStores[0]]);
    expect(result.queryByTestId('select-feature-stores-modal')).not.toBeInTheDocument();
  });
});
