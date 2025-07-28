import React from 'react';
import { EntityList } from '#~/pages/featureStore/types/entities';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import { FeatureStoreToolbar } from '#~/pages/featureStore/components/FeatureStoreToolbar';
import FeatureStoreEntitiesTable from './FeatureStoreEntitiesTable';
import { applyEntityFilters } from '../utils';
import { entityTableFilterOptions } from '../const';

const FeatureStoreEntitiesListView = ({
  entities,
}: {
  entities: EntityList;
}): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();

  const [filterData, setFilterData] = React.useState<
    Record<string, string | { label: string; value: string } | undefined>
  >({});

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(() => setFilterData({}), [setFilterData]);

  const filteredEntities = React.useMemo(
    () => applyEntityFilters(entities.entities, entities.relationships, filterData),
    [entities.entities, entities.relationships, filterData],
  );

  return (
    <FeatureStoreEntitiesTable
      entities={filteredEntities}
      relationships={entities.relationships}
      onClearFilters={onClearFilters}
      toolbarContent={
        <FeatureStoreToolbar
          filterOptions={entityTableFilterOptions(currentProject)}
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
        />
      }
    />
  );
};

export default FeatureStoreEntitiesListView;
