import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- shared table component from ui-core
import { Table } from '@odh-dashboard/ui-core';
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
}) => (
  <Table
    data={featureStores}
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
);

export default FeatureStoreConnectedTable;
