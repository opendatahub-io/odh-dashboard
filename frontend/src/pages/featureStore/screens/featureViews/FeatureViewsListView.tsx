import React from 'react';
import { FeatureViewsList } from '#~/pages/featureStore/types/featureView';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import { FeatureStoreToolbar } from '#~/pages/featureStore/components/FeatureStoreToolbar';
import { featureViewTableFilterOptions } from '#~/pages/featureStore/screens/featureViews/const';
import { applyFeatureViewFilters } from '#~/pages/featureStore/screens/featureViews/utils';
import FeatureViewsTable from '#~/pages/featureStore/screens/featureViews/FeatureViewsTable';
import useDebounceCallback from '#~/utilities/useDebounceCallback';

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
  const { currentProject } = useFeatureStoreProject();

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
  }, []);

  const filteredFeatureViews = React.useMemo(
    () =>
      applyFeatureViewFilters(
        processedFeatureViews,
        featureViewsList.relationships,
        debouncedFilterData,
      ),
    [processedFeatureViews, featureViewsList.relationships, debouncedFilterData],
  );

  return (
    <FeatureViewsTable
      featureViews={filteredFeatureViews}
      relationships={featureViewsList.relationships}
      fsProject={fsProject}
      onClearFilters={onClearFilters}
      toolbarContent={
        <FeatureStoreToolbar
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
          filterOptions={featureViewTableFilterOptions}
        />
      }
    />
  );
};

export default FeatureViewsListView;
