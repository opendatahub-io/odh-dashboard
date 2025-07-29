import React from 'react';
import { FeatureService } from '#~/pages/featureStore/types/featureServices';
import FeatureServiceToolbar from './FeatureServiceToolbar';
import { FeatureServiceFilterDataType, initialFeatureServiceFilterData } from './const';
import FeatureServicesTable from './FeatureServicesTable';

const FeatureServicesListView = ({
  featureServices: unfilteredFeatureServices,
  fsProject,
}: {
  featureServices: FeatureService[];
  fsProject?: string;
}): React.ReactElement => {
  const [filterData, setFilterData] = React.useState<FeatureServiceFilterDataType>(
    initialFeatureServiceFilterData,
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialFeatureServiceFilterData),
    [setFilterData],
  );

  const filteredFeatureServices = React.useMemo(
    () =>
      unfilteredFeatureServices.filter((featureService) => {
        const featureServiceFilter = filterData['Feature service']?.toLowerCase();
        const tagsFilter = filterData.Tags?.toLowerCase();

        if (
          featureServiceFilter &&
          !featureService.spec.name.toLowerCase().includes(featureServiceFilter)
        ) {
          return false;
        }

        return (
          !tagsFilter ||
          Object.entries(featureService.spec.tags ?? {}).some(([key, value]) =>
            `${key}=${value}`.toLowerCase().includes(tagsFilter.toLowerCase()),
          )
        );
      }),
    [unfilteredFeatureServices, filterData],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <FeatureServicesTable
      featureServices={filteredFeatureServices}
      fsProject={fsProject}
      onClearFilters={onClearFilters}
      toolbarContent={
        <FeatureServiceToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
      }
    />
  );
};

export default FeatureServicesListView;
