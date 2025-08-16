import React from 'react';
import FeatureStoreEntitiesTable from './FeatureStoreEntitiesTable';
import { EntityList } from '../../../types/entities';
import { FeatureStoreToolbar } from '../../../components/FeatureStoreToolbar';
import { applyEntityFilters } from '../utils';
import { entityTableFilterOptions } from '../const';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { useTagFilterHandlers } from '../../../utils/useTagFilterHandlers';

const FeatureStoreEntitiesListView = ({
  entities,
}: {
  entities: EntityList;
}): React.ReactElement => {
  const [filterData, setFilterData] = React.useState<
    Record<string, string | { label: string; value: string } | undefined>
  >({});
  const [currentFilterType, setCurrentFilterType] = React.useState<string>('entity');
  const [tagFilters, setTagFilters] = React.useState<string[]>([]);
  const { currentProject } = useFeatureStoreProject();

  const tagHandlers = useTagFilterHandlers(setTagFilters, setCurrentFilterType);

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

  const onClearFilters = React.useCallback(() => {
    setFilterData({});
    setTagFilters([]);
  }, []);

  const filteredEntities = React.useMemo(() => {
    let filtered = processedEntities;
    filtered = applyEntityFilters(filtered, entities.relationships, filterData);
    if (tagFilters.length > 0) {
      filtered = filtered.filter((entity) => {
        const entityTags = entity.spec.tags || {};
        return tagFilters.every((tagFilter) => {
          const tagEntries = Object.entries(entityTags);
          return tagEntries.some(([key, value]) => `${key}=${value}` === tagFilter);
        });
      });
    }

    return filtered;
  }, [processedEntities, entities.relationships, filterData, tagFilters]);

  return (
    <FeatureStoreEntitiesTable
      entities={filteredEntities}
      relationships={entities.relationships}
      onClearFilters={onClearFilters}
      onTagClick={tagHandlers.handleTagClick}
      toolbarContent={
        <FeatureStoreToolbar
          filterOptions={entityTableFilterOptions}
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
          currentFilterType={currentFilterType}
          onFilterTypeChange={tagHandlers.handleFilterTypeChange}
          tagFilters={tagFilters}
          onTagFilterRemove={tagHandlers.handleTagFilterRemove}
          onTagFilterAdd={tagHandlers.handleTagFilterAdd}
        />
      }
    />
  );
};

export default FeatureStoreEntitiesListView;
