import * as React from 'react';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import Table from '@odh-dashboard/internal/components/table/Table';
import { baseColumns } from './const';
import FeatureTableRow from './FeatureTableRow';
import { Features } from '../../types/features';

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
