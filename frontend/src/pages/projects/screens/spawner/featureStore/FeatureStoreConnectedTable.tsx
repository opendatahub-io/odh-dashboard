import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- shared table component from ui-core
import { Table } from '@odh-dashboard/ui-core';
import { Button, Stack, StackItem } from '@patternfly/react-core';
import type { SelectedFeatureStoreConfig } from './useWorkbenchFeatureStores';
import { FeatureStoreConnectedTableRow } from './FeatureStoreConnectedTableRow';
import { featureStoreConnectedTableColumns } from './featureStoreConnectedTableConst';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';

export type FeatureStoreConnectedTableProps = {
  featureStores: SelectedFeatureStoreConfig[];
  availabilityLoaded: boolean;
  onRemove: (projectId: string) => void;
};

export const FeatureStoreConnectedTable: React.FC<FeatureStoreConnectedTableProps> = ({
  featureStores,
  availabilityLoaded,
  onRemove,
}) => {
  const [showUnavailable, setShowUnavailable] = React.useState(false);

  const unavailableCount = React.useMemo(
    () => featureStores.filter((featureStore) => featureStore.isUnavailable).length,
    [featureStores],
  );

  const visibleFeatureStores = React.useMemo(() => {
    if (showUnavailable || unavailableCount === 0) {
      return featureStores;
    }
    return featureStores.filter((featureStore) => !featureStore.isUnavailable);
  }, [featureStores, showUnavailable, unavailableCount]);

  return (
    <Stack hasGutter>
      <StackItem>
        <Table
          data={visibleFeatureStores}
          data-testid="feature-store-connected-table"
          columns={featureStoreConnectedTableColumns}
          rowRenderer={(featureStore) => (
            <FeatureStoreConnectedTableRow
              key={getFeatureStoreProjectId(featureStore)}
              featureStore={featureStore}
              availabilityLoaded={availabilityLoaded}
              onRemove={onRemove}
            />
          )}
          isStriped
        />
      </StackItem>
      {unavailableCount > 0 && (
        <StackItem>
          <Button
            isInline
            variant="link"
            onClick={() => setShowUnavailable((prev) => !prev)}
            aria-label={
              showUnavailable
                ? 'Show less unavailable feature stores'
                : 'Show unavailable feature stores'
            }
            data-testid="feature-store-show-unavailable"
          >
            {showUnavailable ? 'Show less' : 'Show unavailable'}
          </Button>
        </StackItem>
      )}
    </Stack>
  );
};

export default FeatureStoreConnectedTable;
