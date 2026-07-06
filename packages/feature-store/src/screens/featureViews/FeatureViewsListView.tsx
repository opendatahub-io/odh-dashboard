import React from 'react';
import useDebounceCallback from '@odh-dashboard/internal/utilities/useDebounceCallback';
import { applyFeatureViewFilters } from './utils';
import { featureViewTableFilterOptions } from './const';
import FeatureViewsTable from './FeatureViewsTable';
import { FeatureViewsList } from '../../types/featureView';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import { FeatureStoreToolbar } from '../../components/FeatureStoreToolbar';
import { useTagFilterHandlers } from '../../utils/useTagFilterHandlers';
import { applyTagFilters } from '../../utils/filterUtils';

const FeatureViewsListView = ({
  featureViews: featureViewsList,
  fsProject,
  isFromDetailsPage = false,
  fsObject,
}: {
  featureViews: FeatureViewsList;
  fsProject?: string;
  isFromDetailsPage?: boolean;
  fsObject?: {
    entity?: string;
    feature?: string;
    featureService?: string;
  };
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
    filtered = applyTagFilters(filtered, tagFilters);
    return filtered;
  }, [processedFeatureViews, featureViewsList.relationships, debouncedFilterData, tagFilters]);

  // Filter toolbar options based on visible columns
  const filteredFilterOptions = React.useMemo(() => {
    if (!isFromDetailsPage) {
      // Normal table: show all filter options except feature_services
      return Object.fromEntries(
        Object.entries(featureViewTableFilterOptions).filter(([key]) => key !== 'feature_services'),
      );
    }

    // Details page: show specific filter options
    const baseFields = ['featureView', 'features', 'feature_services', 'tag', 'updated'];

    // Remove features filter if on feature details page
    if (fsObject?.feature) {
      const index = baseFields.indexOf('features');
      if (index > -1) {
        baseFields.splice(index, 1);
      }
    }

    // Remove feature_services filter if on feature service details page
    if (fsObject?.featureService) {
      const index = baseFields.indexOf('feature_services');
      if (index > -1) {
        baseFields.splice(index, 1);
      }
    }

    return Object.fromEntries(
      Object.entries(featureViewTableFilterOptions).filter(([key]) => baseFields.includes(key)),
    );
  }, [isFromDetailsPage, fsObject]);

  return (
    <FeatureViewsTable
      featureViews={filteredFeatureViews}
      relationships={featureViewsList.relationships}
      fsProject={fsProject}
      onClearFilters={onClearFilters}
      onTagClick={tagHandlers.handleTagClick}
      isFromDetailsPage={isFromDetailsPage}
      fsObject={fsObject}
      toolbarContent={
        <FeatureStoreToolbar
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
          filterOptions={filteredFilterOptions}
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
