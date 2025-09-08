import * as React from 'react';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import Table from '@odh-dashboard/internal/components/table/Table';
import { columns } from './const';
import FeatureServiceTableRow from './FeatureServiceTableRow';
import { FeatureService } from '../../types/featureServices';

type FeatureServicesTableProps = {
  featureServices: FeatureService[];
  onClearFilters: () => void;
  fsProject?: string;
  onTagClick: (tag: string) => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const FeatureServicesTable: React.FC<FeatureServicesTableProps> = ({
  featureServices,
  onClearFilters,
  toolbarContent,
  fsProject,
  onTagClick,
}) => (
  <Table
    data-testid="feature-services-table"
    id="feature-services-table"
    enablePagination
    data={featureServices}
    columns={columns}
    onClearFilters={onClearFilters}
    toolbarContent={toolbarContent}
    emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
    rowRenderer={(fs, idx) => (
      <FeatureServiceTableRow
        key={`${fs.spec.name}-${idx}`}
        featureService={fs}
        fsProject={fsProject}
        onTagClick={onTagClick}
      />
    )}
  />
);

export default FeatureServicesTable;
