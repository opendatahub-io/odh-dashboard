import React from 'react';
import { PageSection } from '@patternfly/react-core';
import MetricCards from './MetricCards';
import PopularTags from './PopularTags';
import RecentlyVisitedResources from './RecentlyVisitedResources';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useMetricsResourceCount from '../../apiHooks/useMetricsResourceCount';

const Metrics: React.FC = () => {
  const { currentProject } = useFeatureStoreProject();
  const { data: metricsResourceCount, loaded: metricsResourceCountLoaded } =
    useMetricsResourceCount(currentProject ? { project: currentProject } : {});

  return (
    <PageSection hasBodyWrapper={false} padding={{ default: 'noPadding' }}>
      <MetricCards metricsData={metricsResourceCount} loaded={metricsResourceCountLoaded} />
      <PopularTags project={currentProject} limit={4} />
      <RecentlyVisitedResources project={currentProject} />
    </PageSection>
  );
};

export default Metrics;
