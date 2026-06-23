import * as React from 'react';
import { Table } from '#~/components/table';
import type { FeatureStoreProject } from '#~/api/featureStore/custom';
import { FeatureStoreConnectedTableRow } from './FeatureStoreConnectedTableRow';
import { featureStoreConnectedTableColumns } from './featureStoreConnectedTableConst';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';

export type FeatureStoreConnectedTableProps = {
  projects: FeatureStoreProject[];
  onRemove: (projectId: string) => void;
};

export const FeatureStoreConnectedTable: React.FC<FeatureStoreConnectedTableProps> = ({
  projects,
  onRemove,
}) => (
  <Table
    data={projects}
    data-testid="feature-store-connected-table"
    columns={featureStoreConnectedTableColumns}
    rowRenderer={(project) => (
      <FeatureStoreConnectedTableRow
        key={getFeatureStoreProjectId(project)}
        project={project}
        onRemove={onRemove}
      />
    )}
    isStriped
  />
);

export default FeatureStoreConnectedTable;
