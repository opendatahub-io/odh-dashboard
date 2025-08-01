import React from 'react';
import { Features } from '#~/pages/featureStore/types/features';
import FeaturesToolbar from './FeaturesToolbar';
import {
  FeatureFilterDataType,
  FeatureToolbarFilterOptions,
  getInitialFeatureFilterData,
  getFeatureFilterOptions,
} from './const';
import FeaturesTable from './FeaturesTable';

type FeaturesListProps = {
  features: Features[];
  fsProject?: string;
};

const FeaturesList = ({
  features: unfilteredFeatures,
  fsProject,
}: FeaturesListProps): React.ReactElement => {
  // Show all projects when fsProject is empty/undefined
  const showAllProjects = !fsProject;
  const filterOptions = React.useMemo(
    () => getFeatureFilterOptions(showAllProjects),
    [showAllProjects],
  );

  const [filterData, setFilterData] = React.useState<FeatureFilterDataType>(() =>
    getInitialFeatureFilterData(showAllProjects),
  );

  // Update filter data when showAllProjects changes
  React.useEffect(() => {
    setFilterData(getInitialFeatureFilterData(showAllProjects));
  }, [showAllProjects]);

  const onClearFilters = React.useCallback(
    () => setFilterData(getInitialFeatureFilterData(showAllProjects)),
    [setFilterData, showAllProjects],
  );

  const filteredFeatures = React.useMemo(
    () =>
      unfilteredFeatures.filter((feature) => {
        const featureFilter = filterData[FeatureToolbarFilterOptions.feature]?.toLowerCase();
        const projectFilter = filterData[FeatureToolbarFilterOptions.project]?.toLowerCase();
        const tagsFilter = filterData[FeatureToolbarFilterOptions.tags]?.toLowerCase();
        const valueTypeFilter = filterData[FeatureToolbarFilterOptions.valueType]?.toLowerCase();
        const ownerFilter = filterData[FeatureToolbarFilterOptions.owner]?.toLowerCase();

        // Check feature name filter
        if (featureFilter && !feature.name.toLowerCase().includes(featureFilter)) {
          return false;
        }

        // Check project filter (only when showing all projects)
        if (
          showAllProjects &&
          projectFilter &&
          !feature.project?.toLowerCase().includes(projectFilter)
        ) {
          return false;
        }

        // Check tags filter
        if (tagsFilter) {
          const matchesTags = Object.entries(feature.tags ?? {}).some(([key, value]) =>
            `${key}=${value}`.toLowerCase().includes(tagsFilter),
          );
          if (!matchesTags) {
            return false;
          }
        }

        // Check value type filter
        if (valueTypeFilter && !feature.type?.toLowerCase().includes(valueTypeFilter)) {
          return false;
        }

        // Check owner filter
        if (ownerFilter && !feature.owner?.toLowerCase().includes(ownerFilter)) {
          return false;
        }

        return true;
      }),
    [unfilteredFeatures, filterData, showAllProjects],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <FeaturesTable
      features={filteredFeatures}
      fsProject={fsProject}
      onClearFilters={onClearFilters}
      toolbarContent={
        <FeaturesToolbar
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
          filterOptions={filterOptions}
        />
      }
    />
  );
};

export default FeaturesList;
