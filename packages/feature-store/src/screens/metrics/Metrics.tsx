import React from 'react';
import { Stack, StackItem, PageSection } from '@patternfly/react-core';
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
    <PageSection
      hasBodyWrapper={false}
      isFilled
      padding={{ default: 'padding' }}
      style={{ paddingTop: '0px' }}
    >
      <Stack hasGutter>
        <StackItem>
          <MetricCards metricsData={metricsResourceCount} loaded={metricsResourceCountLoaded} />
        </StackItem>
        <StackItem style={{ paddingTop: '2rem' }}>
          <PopularTags project={currentProject} limit={4} />
        </StackItem>
        <StackItem style={{ paddingTop: '2rem' }}>
          <RecentlyVisitedResources project={currentProject} />
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default Metrics;
