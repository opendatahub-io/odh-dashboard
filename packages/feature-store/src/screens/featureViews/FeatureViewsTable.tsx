import * as React from 'react';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import Table from '@odh-dashboard/internal/components/table/Table';
import { columns } from './const';
import { Relationship } from './utils';
import FeatureViewTableRow from './FeatureViewTableRow';
import { FeatureView } from '../../types/featureView';

type FeatureViewsTableProps = {
  featureViews: FeatureView[];
  relationships: Record<string, Relationship[]>;
  onClearFilters: () => void;
  fsProject?: string;
  onTagClick: (tag: string) => void;
  isFromDetailsPage?: boolean;
  fsObject?: {
    entity?: string;
    feature?: string;
    featureService?: string;
  };
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const FeatureViewsTable: React.FC<FeatureViewsTableProps> = ({
  featureViews,
  relationships,
  onClearFilters,
  toolbarContent,
  fsProject,
  onTagClick,
  isFromDetailsPage = false,
  fsObject,
}) => {
  // Show only specific columns when isFromDetailsPage is true
  const filteredColumns = React.useMemo(() => {
    if (!isFromDetailsPage) {
      // Normal table: show all columns except feature_services
      return columns.filter((col) => col.field !== 'feature_services');
    }

    // Details page: show specific columns
    const baseColumns = ['feature_view', 'features', 'feature_services', 'tags', 'updated'];

    // Remove features column if on feature details page
    if (fsObject?.feature) {
      const index = baseColumns.indexOf('features');
      if (index > -1) {
        baseColumns.splice(index, 1);
      }
    }

    // Remove feature_services column if on feature service details page
    if (fsObject?.featureService) {
      const index = baseColumns.indexOf('feature_services');
      if (index > -1) {
        baseColumns.splice(index, 1);
      }
    }

    return columns.filter((col) => baseColumns.includes(col.field));
  }, [isFromDetailsPage, fsObject]);

  return (
    <Table
      data-testid="feature-views-table"
      id="feature-views-table"
      enablePagination
      data={featureViews}
      columns={filteredColumns}
      onClearFilters={onClearFilters}
      toolbarContent={toolbarContent}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      rowRenderer={(fv, idx) => (
        <FeatureViewTableRow
          key={`${fv.spec.name}-${idx}`}
          featureView={fv}
          fsProject={fsProject}
          relationships={relationships}
          onTagClick={onTagClick}
          visibleColumns={filteredColumns}
        />
      )}
    />
  );
};

export default FeatureViewsTable;
