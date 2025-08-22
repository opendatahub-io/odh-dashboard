import React from 'react';
import { featureServiceTableFilterOptions } from './const';
import FeatureServicesTable from './FeatureServicesTable';
import { applyFeatureServiceFilters } from './utils';
import { FeatureServicesList } from '../../types/featureServices';
import { FeatureStoreToolbar } from '../../components/FeatureStoreToolbar';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import { useTagFilterHandlers } from '../../utils/useTagFilterHandlers';
import { applyTagFilters } from '../../utils/filterUtils';

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
  const [currentFilterType, setCurrentFilterType] = React.useState<string>('featureService');
  const [tagFilters, setTagFilters] = React.useState<string[]>([]);
  const { currentProject } = useFeatureStoreProject();

  const tagHandlers = useTagFilterHandlers(setTagFilters, setCurrentFilterType);

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

  const onClearFilters = React.useCallback(() => {
    setFilterData({});
    setTagFilters([]);
  }, []);

  const filteredFeatureServices = React.useMemo(() => {
    let filtered = applyFeatureServiceFilters(
      processedFeatureServices,
      featureServices.relationships,
      filterData,
    );
    filtered = applyTagFilters(filtered, tagFilters);
    return filtered;
  }, [processedFeatureServices, featureServices.relationships, filterData, tagFilters]);

  return (
    <FeatureServicesTable
      featureServices={filteredFeatureServices}
      fsProject={fsProject}
      onClearFilters={onClearFilters}
      onTagClick={tagHandlers.handleTagClick}
      toolbarContent={
        <FeatureStoreToolbar
          filterOptions={featureServiceTableFilterOptions}
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
          currentFilterType={currentFilterType}
          onFilterTypeChange={tagHandlers.handleFilterTypeChange}
          tagFilters={tagFilters}
          onTagFilterRemove={tagHandlers.handleTagFilterRemove}
          onTagFilterAdd={tagHandlers.handleTagFilterAdd}
        />
      }
    />
  );
};

export default FeatureServicesListView;
