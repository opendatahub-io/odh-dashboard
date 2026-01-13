import * as React from 'react';
import { Alert, FormGroup, Skeleton, Stack, StackItem, Tooltip } from '@patternfly/react-core';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import { WorkbenchFeatureStoreConfig } from './useWorkbenchFeatureStores';
import {
  convertFeatureStoresToSelectionOptions,
  getSelectedFeatureStoresFromSelections,
} from './utils';

const FEATURE_STORE_SELECTION_HELP =
  'Select feature stores to connect to this workbench. Features in selected feature stores have read and write access to this workbench. ';

const NO_FEATURE_STORES_TOOLTIP =
  'The current project doesn’t have access to any feature stores. Contact your admin to request access.';

type FeatureStoreSelectorProps = {
  selectedFeatureStores?: WorkbenchFeatureStoreConfig[];
  onSelect: (featureStores: WorkbenchFeatureStoreConfig[]) => void;
  availableFeatureStores: WorkbenchFeatureStoreConfig[];
  loaded: boolean;
  error?: Error;
  isDisabled?: boolean;
};

const FeatureStoreSelector: React.FC<FeatureStoreSelectorProps> = ({
  selectedFeatureStores = [],
  onSelect,
  availableFeatureStores,
  loaded,
  error,
  isDisabled = false,
}) => {
  const selectionOptions: SelectionOptions[] = React.useMemo(
    () => convertFeatureStoresToSelectionOptions(availableFeatureStores, selectedFeatureStores),
    [availableFeatureStores, selectedFeatureStores],
  );

  const selectedFeatureStoreOptionsKey = React.useMemo(
    () => selectionOptions.map((opt) => `${opt.id}-${String(opt.selected)}`).join(','),
    [selectionOptions],
  );

  const hasNoFeatureStores = loaded && availableFeatureStores.length === 0;
  const shouldDisable = isDisabled || hasNoFeatureStores;

  const handleSelectionChange = React.useCallback(
    (newSelections: SelectionOptions[]) => {
      const selectedConfigs = getSelectedFeatureStoresFromSelections(
        newSelections,
        availableFeatureStores,
        selectedFeatureStores,
      );
      onSelect(selectedConfigs);
    },
    [availableFeatureStores, selectedFeatureStores, onSelect],
  );

  if (error) {
    return (
      <Stack hasGutter data-testid="feature-store-section">
        <StackItem>
          <FormGroup label="Feature store selection" fieldId="feature-store-select">
            <Alert
              title="Failed to load feature stores"
              variant="danger"
              data-testid="feature-store-error-alert-message"
            >
              {error.message || 'An error occurred while loading feature stores'}
            </Alert>
          </FormGroup>
        </StackItem>
      </Stack>
    );
  }

  if (!loaded) {
    return (
      <Stack hasGutter data-testid="feature-store-section">
        <StackItem>
          <FormGroup label="Feature store selection" fieldId="feature-store-select">
            <Skeleton />
          </FormGroup>
        </StackItem>
      </Stack>
    );
  }

  const multiSelection = (
    <MultiSelection
      data-testid="feature-store-typeahead"
      key={`feature-store-${selectedFeatureStoreOptionsKey}`}
      id="feature-store-select"
      ariaLabel="Select feature stores"
      placeholder="Select a feature store"
      value={selectionOptions}
      setValue={handleSelectionChange}
      isDisabled={shouldDisable}
      toggleId="feature-store-select-toggle"
      inputId="feature-store-select-input"
      toggleTestId="feature-store-typeahead"
      listTestId="feature-store-typeahead-list"
      filterFunction={(filterText, options) =>
        options.filter(
          (o) => !filterText || o.name.toLowerCase().includes(filterText.toLowerCase()),
        )
      }
    />
  );

  return (
    <Stack hasGutter data-testid="feature-store-section">
      <StackItem>
        <FormGroup
          label="Feature store selection"
          fieldId="feature-store-select"
          labelHelp={<DashboardHelpTooltip content={FEATURE_STORE_SELECTION_HELP} />}
        >
          {hasNoFeatureStores ? (
            <Tooltip content={NO_FEATURE_STORES_TOOLTIP}>
              <span>{multiSelection}</span>
            </Tooltip>
          ) : (
            multiSelection
          )}
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default FeatureStoreSelector;
