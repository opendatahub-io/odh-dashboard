import React from 'react';
import { featureServiceTableFilterOptions } from './const';
import FeatureServicesTable from './FeatureServicesTable';
import { applyFeatureServiceFilters } from './utils';
import { FeatureServicesList } from '../../types/featureServices';
import { FeatureStoreToolbar } from '../../components/FeatureStoreToolbar';
import { useFeatureStoreProject } from '../../FeatureStoreContext';

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
