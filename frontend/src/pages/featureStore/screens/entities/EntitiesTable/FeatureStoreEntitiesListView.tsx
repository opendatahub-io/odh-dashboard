import React from 'react';
import { EntityList } from '#~/pages/featureStore/types/entities';
import { FeatureStoreToolbar } from '#~/pages/featureStore/components/FeatureStoreToolbar';
import { applyEntityFilters } from '#~/pages/featureStore/screens/entities/utils';
import { entityTableFilterOptions } from '#~/pages/featureStore/screens/entities/const';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext.tsx';
import FeatureStoreEntitiesTable from './FeatureStoreEntitiesTable';

const FeatureStoreEntitiesListView = ({
  entities,
}: {
  entities: EntityList;
}): React.ReactElement => {
  const [filterData, setFilterData] = React.useState<
    Record<string, string | { label: string; value: string } | undefined>
  >({});
  const { currentProject } = useFeatureStoreProject();
  const processedEntities = React.useMemo(() => {
    if (currentProject) {
      return entities.entities.map((entity) => ({
        ...entity,
        project: entity.project || currentProject,
      }));
    }
    return entities.entities;
  }, [entities.entities, currentProject]);

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(() => setFilterData({}), [setFilterData]);

  const filteredEntities = React.useMemo(
    () => applyEntityFilters(processedEntities, entities.relationships, filterData),
    [processedEntities, entities.relationships, filterData],
  );

  return (
    <FeatureStoreEntitiesTable
      entities={filteredEntities}
      relationships={entities.relationships}
      onClearFilters={onClearFilters}
      toolbarContent={
        <FeatureStoreToolbar
          filterOptions={entityTableFilterOptions}
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
        />
      }
    />
  );
};

export default FeatureStoreEntitiesListView;
