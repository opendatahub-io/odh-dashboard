import React from 'react';
import { Features } from '#~/pages/featureStore/types/features';
import { FeatureStoreToolbar } from '#~/pages/featureStore/components/FeatureStoreToolbar';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import { featureTableFilterOptions } from './const';
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
  const [filterData, setFilterData] = React.useState<
    Record<string, string | { label: string; value: string } | undefined>
  >({});
  const { currentProject } = useFeatureStoreProject();

  const processedFeatures = React.useMemo(() => {
    if (currentProject) {
      return unfilteredFeatures.map((feature) => ({
        ...feature,
        project: feature.project || currentProject,
      }));
    }
    return unfilteredFeatures;
  }, [unfilteredFeatures, currentProject]);

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(() => setFilterData({}), [setFilterData]);

  const filteredFeatures = React.useMemo(
    () => applyFeatureFilters(processedFeatures, filterData, {}),
    [processedFeatures, filterData],
  );

  return (
    <FeaturesTable
      features={filteredFeatures}
      fsProject={fsProject}
      onClearFilters={onClearFilters}
      toolbarContent={
        <FeatureStoreToolbar
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
          filterOptions={featureTableFilterOptions}
        />
      }
    />
  );
};

export default FeaturesList;
