import * as React from 'react';
import { Table } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { Features } from '#~/pages/featureStore/types/features';
import { getColumns } from './const';
import FeatureTableRow from './FeatureTableRow';

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
}) => {
  const showAllProjects = !fsProject;
  const columns = React.useMemo(() => getColumns(showAllProjects), [showAllProjects]);

  return (
    <Table
      data-testid="features-table"
      id="features-table"
      enablePagination
      data={features}
      columns={columns}
      onClearFilters={onClearFilters}
      toolbarContent={toolbarContent}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      rowRenderer={(fv, idx) => (
        <FeatureTableRow
          key={`${fv.name}-${idx}`}
          features={fv}
          fsProject={fsProject}
          showAllProjects={showAllProjects}
        />
      )}
    />
  );
};
export default FeaturesTable;
