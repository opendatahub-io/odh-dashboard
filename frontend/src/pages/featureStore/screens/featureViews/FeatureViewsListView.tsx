import React from 'react';
import { FeatureView } from '#~/pages/featureStore/types/featureView';
import FeatureViewToolbar from './FeatureViewToolbar';
import { FeatureViewFilterDataType, initialFeatureViewFilterData } from './const';
import FeatureViewsTable from './FeatureViewsTable';

const FeatureViewsListView = ({
  featureViews: unfilteredFeatureViews,
  fsProject,
}: {
  featureViews: FeatureView[];
  fsProject?: string;
}): React.ReactElement => {
  const [filterData, setFilterData] = React.useState<FeatureViewFilterDataType>(
    initialFeatureViewFilterData,
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialFeatureViewFilterData),
    [setFilterData],
  );

  const filteredFeatureViews = React.useMemo(
    () =>
      unfilteredFeatureViews.filter((featureView) => {
        const featureViewFilter = filterData['Feature view']?.toLowerCase();
        const tagsFilter = filterData.Tags?.toLowerCase();

        if (featureViewFilter && !featureView.spec.name.toLowerCase().includes(featureViewFilter)) {
          return false;
        }

        return (
          !tagsFilter ||
          Object.entries(featureView.spec.tags ?? {}).some(([key, value]) =>
            `${key}=${value}`.toLowerCase().includes(tagsFilter.toLowerCase()),
          )
        );
      }),
    [unfilteredFeatureViews, filterData],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <FeatureViewsTable
      featureViews={filteredFeatureViews}
      fsProject={fsProject}
      onClearFilters={onClearFilters}
      toolbarContent={
        <FeatureViewToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
      }
    />
  );
};

export default FeatureViewsListView;
