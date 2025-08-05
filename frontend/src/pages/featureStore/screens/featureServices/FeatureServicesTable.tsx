import * as React from 'react';
import { Table } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { FeatureService } from '#~/pages/featureStore/types/featureServices';
import { columns } from './const';
import FeatureServiceTableRow from './FeatureServiceTableRow';

type FeatureServicesTableProps = {
  featureServices: FeatureService[];
  onClearFilters: () => void;
  fsProject?: string;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const FeatureServicesTable: React.FC<FeatureServicesTableProps> = ({
  featureServices,
  onClearFilters,
  toolbarContent,
  fsProject,
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
      />
    )}
  />
);

export default FeatureServicesTable;
