import * as React from 'react';
import { useParams } from 'react-router-dom';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectObjectType } from '~/concepts/design/utils';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { MetricsCommonContextProvider } from '~/concepts/metrics/MetricsCommonContext';
import { RefreshIntervalTitle } from '~/concepts/metrics/types';
import { DistributedWorkloadsContextProvider } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import GlobalDistributedWorkloadsTabs from '~/pages/distributedWorkloads/global/GlobalDistributedWorkloadsTabs';
import { DistributedWorkloadsTabId } from '~/pages/distributedWorkloads/global/useDistributedWorkloadsTabs';

const DistributedWorkloadsSection: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { tab } = useParams();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const tabId = (tab || DistributedWorkloadsTabId.PROJECT_METRICS) as DistributedWorkloadsTabId;

  return (
    <DetailsSection
      id={ProjectSectionID.DISTRIBUTED_WORKLOADS}
      objectType={ProjectObjectType.distributedWorkload}
      title={ProjectSectionTitles[ProjectSectionID.DISTRIBUTED_WORKLOADS]}
      description="Monitor the metrics of your active resources."
      data-testid={ProjectSectionID.DISTRIBUTED_WORKLOADS}
      isLoading={false}
      isEmpty={false}
      emptyState={<div />}
    >
      <MetricsCommonContextProvider initialRefreshInterval={RefreshIntervalTitle.THIRTY_MINUTES}>
        <DistributedWorkloadsContextProvider namespace={currentProject.metadata.name}>
          <GlobalDistributedWorkloadsTabs activeTabId={tabId} />
        </DistributedWorkloadsContextProvider>
      </MetricsCommonContextProvider>
    </DetailsSection>
  );
};

export default DistributedWorkloadsSection;
