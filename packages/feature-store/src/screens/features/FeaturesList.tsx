import React from 'react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { featureTableFilterOptions } from './const';
import FeaturesTable from './FeaturesTable';
import { applyFeatureFilters, applyFeatureTagFilters } from './utils';
import { Features } from '../../types/features';
import { FeatureStoreToolbar } from '../../components/FeatureStoreToolbar';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import { useTagFilterHandlers } from '../../utils/useTagFilterHandlers';
import {
  FEATURE_STORE_EVENTS,
  FilterRemovedProperties,
} from '../../tracking/featureStoreTrackingConstants';

type FeaturesListProps = {
  features: Features[];
  fsProject?: string;
  initialFilter?: Record<string, string | { label: string; value: string } | undefined>;
};

const FeaturesList = ({
  features: unfilteredFeatures,
  fsProject,
  initialFilter = {},
}: FeaturesListProps): React.ReactElement => {
  const [filterData, setFilterData] =
    React.useState<Record<string, string | { label: string; value: string } | undefined>>(
      initialFilter,
    );
  const [currentFilterType, setCurrentFilterType] = React.useState<string>('feature');
  const [tagFilters, setTagFilters] = React.useState<string[]>([]);
  const { currentProject } = useFeatureStoreProject();

  const tagHandlers = useTagFilterHandlers(setTagFilters, setCurrentFilterType);

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

  const onClearFilters = React.useCallback(() => {
    fireMiscTrackingEvent(FEATURE_STORE_EVENTS.FILTER_REMOVED, {
      action: 'clearAll',
      resourceType: 'feature',
    } satisfies FilterRemovedProperties);
    setFilterData({});
    setTagFilters([]);
  }, []);

  const filteredFeatures = React.useMemo(() => {
    let filtered = applyFeatureFilters(processedFeatures, filterData, {});
    filtered = applyFeatureTagFilters(filtered, tagFilters);
    return filtered;
  }, [processedFeatures, filterData, tagFilters]);

  return (
    <FeaturesTable
      features={filteredFeatures}
      fsProject={fsProject}
      onClearFilters={onClearFilters}
      onTagClick={tagHandlers.handleTagClick}
      toolbarContent={
        <FeatureStoreToolbar
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
          filterOptions={featureTableFilterOptions}
          currentFilterType={currentFilterType}
          onFilterTypeChange={tagHandlers.handleFilterTypeChange}
          tagFilters={tagFilters}
          onTagFilterRemove={tagHandlers.handleTagFilterRemove}
          onTagFilterAdd={tagHandlers.handleTagFilterAdd}
          trackingResourceType="feature"
        />
      }
    />
  );
};

export default FeaturesList;
