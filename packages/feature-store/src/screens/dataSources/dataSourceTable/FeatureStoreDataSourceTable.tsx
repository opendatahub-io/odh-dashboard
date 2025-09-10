import Table from '@odh-dashboard/internal/components/table/Table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import * as React from 'react';
import FeatureStoreDataSourcesTableRow from './FeatureStoreDataSourceTableRow';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { DataSource } from '../../../types/dataSources';
import { FeatureStoreRelationship } from '../../../types/global';
import { columns } from '../const';

type FeatureStoreDataSourcesTableProps = {
  dataSources: DataSource[];
  relationships: Record<string, FeatureStoreRelationship[]>;
  onClearFilters: () => void;
  toolbarContent: React.ComponentProps<typeof Table>['toolbarContent'];
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination'>>;

const FeatureStoreDataSourcesTable: React.FC<FeatureStoreDataSourcesTableProps> = ({
  dataSources,
  relationships,
  onClearFilters,
  toolbarContent,
}) => {
  const { currentProject } = useFeatureStoreProject();

  return (
    <Table
      data-testid="feature-store-data-sources-table"
      id="feature-store-data-sources-table"
      enablePagination
      data={dataSources}
      columns={columns}
      onClearFilters={onClearFilters}
      toolbarContent={toolbarContent}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      rowRenderer={(cr) => (
        <FeatureStoreDataSourcesTableRow
          key={currentProject ? cr.name : `${cr.name}-${cr.project ?? ''}`}
          dataSource={cr}
          relationships={relationships}
        />
      )}
    />
  );
};
export default FeatureStoreDataSourcesTable;
