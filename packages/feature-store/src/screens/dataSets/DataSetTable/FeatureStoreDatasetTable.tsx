import * as React from 'react';
import { DashboardEmptyTableView, Table } from '@odh-dashboard/ui-core';
import FeatureStoreDataSetsTableRow from './FeatureStoreDataSetTableRow';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { columns } from '../const';
import { DataSet } from '../../../types/dataSets';

type FeatureStoreDataSetsTableProps = {
  dataSets: DataSet[];
  onClearFilters: () => void;
  toolbarContent: React.ComponentProps<typeof Table>['toolbarContent'];
  onTagClick?: (tagString: string) => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination'>>;

const FeatureStoreDataSetsTable: React.FC<FeatureStoreDataSetsTableProps> = ({
  dataSets,
  onClearFilters,
  toolbarContent,
  onTagClick,
}) => {
  const { currentProject } = useFeatureStoreProject();

  return (
    <Table
      data-testid="feature-store-data-sets-table"
      id="feature-store-data-sets-table"
      enablePagination
      data={dataSets}
      columns={columns}
      onClearFilters={onClearFilters}
      toolbarContent={toolbarContent}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      rowRenderer={(cr) => (
        <FeatureStoreDataSetsTableRow
          key={`${cr.spec.name}-${cr.project ?? currentProject ?? ''}`}
          dataSet={cr}
          onTagClick={onTagClick}
        />
      )}
    />
  );
};
export default FeatureStoreDataSetsTable;
