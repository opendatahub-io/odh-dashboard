import * as React from 'react';
import { Table } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { Features } from '#~/pages/featureStore/types/features';
import FeatureTableRow from './FeatureTableRow';
import { baseColumns } from './const';

type FeaturesTableProps = {
  features: Features[];
  onClearFilters: () => void;
  fsProject?: string;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const FeaturesTable: React.FC<FeaturesTableProps> = ({
  features,
  onClearFilters,
  toolbarContent,
  fsProject,
}) => (
  <Table
    data-testid="features-table"
    id="features-table"
    enablePagination
    data={features}
    columns={baseColumns}
    onClearFilters={onClearFilters}
    toolbarContent={toolbarContent}
    emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
    rowRenderer={(fv, idx) => (
      <FeatureTableRow key={`${fv.name}-${idx}`} features={fv} fsProject={fsProject} />
    )}
  />
);
export default FeaturesTable;
