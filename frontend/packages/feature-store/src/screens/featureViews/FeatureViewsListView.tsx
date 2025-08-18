import React from 'react';
import useDebounceCallback from '@odh-dashboard/internal/utilities/useDebounceCallback';
import { applyFeatureViewFilters } from './utils';
import { featureViewTableFilterOptions } from './const';
import FeatureViewsTable from './FeatureViewsTable';
import { FeatureViewsList } from '../../types/featureView';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import { FeatureStoreToolbar } from '../../components/FeatureStoreToolbar';

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
