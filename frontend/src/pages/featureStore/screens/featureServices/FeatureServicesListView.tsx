import React from 'react';
import { FeatureServicesList } from '#~/pages/featureStore/types/featureServices';
import { FeatureStoreToolbar } from '#~/pages/featureStore/components/FeatureStoreToolbar';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import { featureServiceTableFilterOptions } from './const';
import FeatureServicesTable from './FeatureServicesTable';
import { applyFeatureServiceFilters } from './utils';

const FeatureServicesListView = ({
  featureServices,
  fsProject,
}: {
  featureServices: FeatureServicesList;
  fsProject?: string;
}): React.ReactElement => {
  const [filterData, setFilterData] = React.useState<
    Record<string, string | { label: string; value: string } | undefined>
  >({});
  const { currentProject } = useFeatureStoreProject();

  const processedFeatureServices = React.useMemo(() => {
    if (currentProject) {
      return featureServices.featureServices.map((featureService) => ({
        ...featureService,
        project: featureService.project || currentProject,
      }));
    }
    return featureServices.featureServices;
  }, [featureServices.featureServices, currentProject]);

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(() => setFilterData({}), [setFilterData]);

  const filteredFeatureServices = React.useMemo(
    () =>
      applyFeatureServiceFilters(
        processedFeatureServices,
        featureServices.relationships,
        filterData,
      ),
    [processedFeatureServices, featureServices.relationships, filterData],
  );

  return (
    <FeatureServicesTable
      featureServices={filteredFeatureServices}
      fsProject={fsProject}
      onClearFilters={onClearFilters}
      toolbarContent={
        <FeatureStoreToolbar
          filterOptions={featureServiceTableFilterOptions}
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
        />
      }
    />
  );
};

export default FeatureServicesListView;
