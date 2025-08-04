import React from 'react';
import { Features } from '#~/pages/featureStore/types/features';
import FeaturesToolbar from './FeaturesToolbar';
import {
  FeatureFilterDataType,
  getInitialFeatureFilterData,
  getFeatureFilterOptions,
} from './const';
import { applyFeatureFilters } from './utils';
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
    () => applyFeatureFilters(unfilteredFeatures, filterData),
    [unfilteredFeatures, filterData],
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
