import React from 'react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import FeatureStoreDataSetsTable from './FeatureStoreDatasetTable';
import { FeatureStoreToolbar } from '../../../components/FeatureStoreToolbar';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { DataSetList } from '../../../types/dataSets';
import { dataSetTableFilterOptions } from '../const';
import { applyDataSetFilters } from '../utils';
import { useTagFilterHandlers } from '../../../utils/useTagFilterHandlers';
import { applyTagFilters } from '../../../utils/filterUtils';
import {
  FEATURE_STORE_EVENTS,
  FilterRemovedProperties,
} from '../../../tracking/featureStoreTrackingConstants';

const FeatureStoreDataSetsListView = ({
  dataSets,
}: {
  dataSets: DataSetList;
}): React.ReactElement => {
  const [filterData, setFilterData] = React.useState<
    Record<string, string | { label: string; value: string } | undefined>
  >({});
  const [currentFilterType, setCurrentFilterType] = React.useState<string>('dataSet');
  const [tagFilters, setTagFilters] = React.useState<string[]>([]);
  const { currentProject } = useFeatureStoreProject();

  const tagHandlers = useTagFilterHandlers(setTagFilters, setCurrentFilterType);

  const processedDataSets = React.useMemo(() => {
    if (currentProject) {
      return dataSets.savedDatasets.map((dataSet) => ({
        ...dataSet,
        project: dataSet.project || currentProject,
      }));
    }
    return dataSets.savedDatasets;
  }, [dataSets.savedDatasets, currentProject]);

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(() => {
    fireMiscTrackingEvent(FEATURE_STORE_EVENTS.FILTER_REMOVED, {
      action: 'clearAll',
      resourceType: 'dataSet',
    } satisfies FilterRemovedProperties);
    setFilterData({});
    setTagFilters([]);
  }, []);

  const filteredDataSets = React.useMemo(() => {
    let filtered = applyDataSetFilters(processedDataSets, dataSets.relationships, filterData);
    filtered = applyTagFilters(filtered, tagFilters);
    return filtered;
  }, [processedDataSets, dataSets.relationships, filterData, tagFilters]);

  return (
    <FeatureStoreDataSetsTable
      dataSets={filteredDataSets}
      onClearFilters={onClearFilters}
      onTagClick={tagHandlers.handleTagClick}
      toolbarContent={
        <FeatureStoreToolbar
          filterOptions={dataSetTableFilterOptions}
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
          currentFilterType={currentFilterType}
          onFilterTypeChange={tagHandlers.handleFilterTypeChange}
          tagFilters={tagFilters}
          onTagFilterRemove={tagHandlers.handleTagFilterRemove}
          onTagFilterAdd={tagHandlers.handleTagFilterAdd}
          trackingResourceType="dataSet"
        />
      }
    />
  );
};

export default FeatureStoreDataSetsListView;
