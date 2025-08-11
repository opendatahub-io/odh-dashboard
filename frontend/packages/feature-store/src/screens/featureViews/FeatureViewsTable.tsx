import * as React from 'react';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import Table from '@odh-dashboard/internal/components/table/Table';
import { Relationship } from './utils';
import FeatureViewTableRow from './FeatureViewTableRow';
import { columns } from './const';
import { FeatureView } from '../../types/featureView';

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
