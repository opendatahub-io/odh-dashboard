import React from 'react';
import { FeatureViewsList } from '../../types/featureView';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import { FeatureStoreToolbar } from '../../components/FeatureStoreToolbar';
import { featureViewTableFilterOptions } from './const';
import { applyFeatureViewFilters } from './utils';
import FeatureViewsTable from './FeatureViewsTable';
import useDebounceCallback from '@odh-dashboard/internal/utilities/useDebounceCallback';
import { useTagFilterHandlers } from '../../utils/useTagFilterHandlers';

const FeatureViewsListView = ({
  featureViews: featureViewsList,
  fsProject,
}: {
  featureViews: FeatureViewsList;
  fsProject?: string;
}): React.ReactElement => {
  const [filterData, setFilterData] = React.useState<
    Record<string, string | { label: string; value: string } | undefined>
  >({});
  const [debouncedFilterData, setDebouncedFilterData] = React.useState<
    Record<string, string | { label: string; value: string } | undefined>
  >({});
  const [currentFilterType, setCurrentFilterType] = React.useState<string>('featureView');
  const [tagFilters, setTagFilters] = React.useState<string[]>([]);
  const { currentProject } = useFeatureStoreProject();

  const tagHandlers = useTagFilterHandlers(setTagFilters, setCurrentFilterType);

  const processedFeatureViews = React.useMemo(() => {
    if (currentProject) {
      return featureViewsList.featureViews.map((featureView) => ({
        ...featureView,
        project: featureView.project || currentProject,
      }));
    }
    return featureViewsList.featureViews;
  }, [featureViewsList.featureViews, currentProject]);

  const debouncedSetFilterData = useDebounceCallback(
    React.useCallback((newFilterData: typeof filterData) => {
      setDebouncedFilterData(newFilterData);
    }, []),
    100,
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) => {
      const newFilterData = { ...filterData, [key]: value };
      setFilterData(newFilterData);
      debouncedSetFilterData(newFilterData);
    },
    [filterData, debouncedSetFilterData],
  );

  const onClearFilters = React.useCallback(() => {
    setFilterData({});
    setDebouncedFilterData({});
    setTagFilters([]);
  }, []);

  const filteredFeatureViews = React.useMemo(() => {
    let filtered = applyFeatureViewFilters(
      processedFeatureViews,
      featureViewsList.relationships,
      debouncedFilterData,
    );

    if (tagFilters.length > 0) {
      filtered = filtered.filter((featureView) => {
        const featureViewTags = featureView.spec.tags || {};
        return tagFilters.every((tagFilter) => {
          const tagEntries = Object.entries(featureViewTags);
          return tagEntries.some(([key, value]) => `${key}=${value}` === tagFilter);
        });
      });
    }

    return filtered;
  }, [processedFeatureViews, featureViewsList.relationships, debouncedFilterData, tagFilters]);

  return (
    <FeatureViewsTable
      featureViews={filteredFeatureViews}
      relationships={featureViewsList.relationships}
      fsProject={fsProject}
      onClearFilters={onClearFilters}
      onTagClick={tagHandlers.handleTagClick}
      toolbarContent={
        <FeatureStoreToolbar
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
          filterOptions={featureViewTableFilterOptions}
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

export default FeatureViewsListView;
