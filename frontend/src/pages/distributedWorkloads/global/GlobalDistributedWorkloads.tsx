import * as React from 'react';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { DistributedWorkloadsContextProvider } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { useDistributedWorkloadsTabs } from '~/pages/distributedWorkloads/global/useDistributedWorkloadsTabs';
import DistributedWorkloadsNoProjects from '~/pages/distributedWorkloads/global/DistributedWorkloadsNoProjects';
import GlobalDistributedWorkloadsTabs from '~/pages/distributedWorkloads/global/GlobalDistributedWorkloadsTabs';
import { MetricsCommonContextProvider } from '~/concepts/metrics/MetricsCommonContext';
import { RefreshIntervalTitle } from '~/concepts/metrics/types';
import ProjectSelectorNavigator from '~/concepts/projects/ProjectSelectorNavigator';
import { useQueryParams } from '~/utilities/useQueryParams';

const title = 'Distributed Workload Metrics';
const description = 'Monitor the metrics of your active resources.';

const GlobalDistributedWorkloads: React.FC = () => {
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const queryParams = useQueryParams();
  const tabs = useDistributedWorkloadsTabs();
  const firstAvailableTab = tabs.find((tab) => tab.isAvailable);
  const activeTabParam = queryParams.get('tab');
  const activeTab =
    (activeTabParam ? tabs.find((t) => t.path === activeTabParam) : undefined) || firstAvailableTab;

  if (projects.length === 0) {
    return (
      <ApplicationsPage
        {...{ title, description }}
        loaded
        empty
        emptyStatePage={<DistributedWorkloadsNoProjects />}
      />
    );
  }

  if (!preferredProject || !activeTab) {
    // The namespace in the URL is invalid
    return <ApplicationsPage {...{ title, description }} loaded empty />;
  }

  // We're all good, we have a namespace matching a known project
  return (
    <ApplicationsPage
      {...{ title, description }}
      loaded
      empty={false}
      headerContent={
        <ProjectSelectorNavigator
          getRedirectPath={(ns: string) =>
            `/projects/${ns}/distributedWorkloads?tab=${activeTab.path}`
          }
          showTitle
        />
      }
    >
      <MetricsCommonContextProvider initialRefreshInterval={RefreshIntervalTitle.THIRTY_MINUTES}>
        <DistributedWorkloadsContextProvider namespace={preferredProject.metadata.name}>
          <GlobalDistributedWorkloadsTabs activeTabId={activeTab.id} />
        </DistributedWorkloadsContextProvider>
      </MetricsCommonContextProvider>
    </ApplicationsPage>
  );
};

export default GlobalDistributedWorkloads;
