import * as React from 'react';
import { Table } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView.tsx';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import { Entity, EntityRelationship } from '#~/pages/featureStore/types/entities';
import FeatureStoreEntitiesTableRow from './FeatureStoreEntitiesTableRow';
import { AllProjectColumns, columns } from '../const';

type FeatureStoreEntitiesTableProps = {
  entities: Entity[];
  relationships: Record<string, EntityRelationship[]>;
  onClearFilters: () => void;
  toolbarContent: React.ComponentProps<typeof Table>['toolbarContent'];
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination'>>;

const FeatureStoreEntitiesTable: React.FC<FeatureStoreEntitiesTableProps> = ({
  entities,
  relationships,
  onClearFilters,
  toolbarContent,
}) => {
  const { currentProject } = useFeatureStoreProject();
  const entityColumns = currentProject ? columns : AllProjectColumns;

  return (
    <Table
      data-testid="feature-store-entities-table"
      id="feature-store-entities-table"
      enablePagination
      data={entities}
      columns={entityColumns}
      onClearFilters={onClearFilters}
      toolbarContent={toolbarContent}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      rowRenderer={(cr) => (
        <FeatureStoreEntitiesTableRow
          key={currentProject ? cr.spec.name : `${cr.spec.name}-${cr.project ?? ''}`}
          entity={cr}
          relationships={relationships}
        />
      )}
    />
  );
};
export default FeatureStoreEntitiesTable;
