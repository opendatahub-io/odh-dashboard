import React from 'react';
import { FeatureViewsList } from '#~/pages/featureStore/types/featureView';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import { FeatureStoreToolbar } from '#~/pages/featureStore/components/FeatureStoreToolbar';
import { featureViewTableFilterOptions } from '#~/pages/featureStore/screens/featureViews/const';
import { applyFeatureViewFilters } from '#~/pages/featureStore/screens/featureViews/utils';
import FeatureViewsTable from '#~/pages/featureStore/screens/featureViews/FeatureViewsTable';

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

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(() => setFilterData({}), [setFilterData]);

  const filteredFeatureViews = React.useMemo(
    () =>
      applyFeatureViewFilters(processedFeatureViews, featureViewsList.relationships, filterData),
    [processedFeatureViews, featureViewsList.relationships, filterData],
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
