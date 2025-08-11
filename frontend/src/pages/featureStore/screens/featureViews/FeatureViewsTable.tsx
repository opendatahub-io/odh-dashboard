import * as React from 'react';
import { Table } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { FeatureView } from '#~/pages/featureStore/types/featureView';
import { columns } from './const';
import { Relationship } from './utils';
import FeatureViewTableRow from './FeatureViewTableRow';

type FeatureViewsTableProps = {
  featureViews: FeatureView[];
  relationships: Record<string, Relationship[]>;
  onClearFilters: () => void;
  fsProject?: string;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const FeatureViewsTable: React.FC<FeatureViewsTableProps> = ({
  featureViews,
  relationships,
  onClearFilters,
  toolbarContent,
  fsProject,
}) => (
  <Table
    data-testid="feature-views-table"
    id="feature-views-table"
    enablePagination
    data={featureViews}
    columns={columns}
    onClearFilters={onClearFilters}
    toolbarContent={toolbarContent}
    emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
    rowRenderer={(fv, idx) => (
      <FeatureViewTableRow
        key={`${fv.spec.name}-${idx}`}
        featureView={fv}
        fsProject={fsProject}
        relationships={relationships}
      />
    )}
  />
);

export default FeatureViewsTable;
