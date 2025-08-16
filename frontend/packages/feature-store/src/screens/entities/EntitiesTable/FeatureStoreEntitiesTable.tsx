import * as React from 'react';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import Table from '@odh-dashboard/internal/components/table/Table';
import FeatureStoreEntitiesTableRow from './FeatureStoreEntitiesTableRow';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { Entity } from '../../../types/entities';
import { FeatureStoreRelationship } from '../../../types/global';
import { columns } from '../const';

type FeatureStoreEntitiesTableProps = {
  entities: Entity[];
  relationships: Record<string, FeatureStoreRelationship[]>;
  onClearFilters: () => void;
  toolbarContent: React.ComponentProps<typeof Table>['toolbarContent'];
  onTagClick?: (tagString: string) => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination'>>;

const FeatureStoreEntitiesTable: React.FC<FeatureStoreEntitiesTableProps> = ({
  entities,
  relationships,
  onClearFilters,
  toolbarContent,
  onTagClick,
}) => {
  const { currentProject } = useFeatureStoreProject();

  return (
    <Table
      data-testid="feature-store-entities-table"
      id="feature-store-entities-table"
      enablePagination
      data={entities}
      columns={columns}
      onClearFilters={onClearFilters}
      toolbarContent={toolbarContent}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      rowRenderer={(cr) => (
        <FeatureStoreEntitiesTableRow
          key={currentProject ? cr.spec.name : `${cr.spec.name}-${cr.project ?? ''}`}
          entity={cr}
          relationships={relationships}
          onTagClick={onTagClick}
        />
      )}
    />
  );
};
export default FeatureStoreEntitiesTable;
