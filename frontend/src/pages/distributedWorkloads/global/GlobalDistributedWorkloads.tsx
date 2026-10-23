import * as React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Alert, PageSection } from '@patternfly/react-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { RefreshIntervalTitle } from '@odh-dashboard/ui-core/types/metrics';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import InvalidProject from '@odh-dashboard/ui-core/components/InvalidProject';
import { MetricsCommonContextProvider } from '@odh-dashboard/ui-core/contexts/MetricsCommonContext';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { DistributedWorkloadsContextProvider } from '#~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { DistributedWorkloadsTabConfig } from '#~/pages/distributedWorkloads/global/useDistributedWorkloadsTabs';
import DistributedWorkloadsNoProjects from '#~/pages/distributedWorkloads/global/DistributedWorkloadsNoProjects';
import GlobalDistributedWorkloadsTabs from '#~/pages/distributedWorkloads/global/GlobalDistributedWorkloadsTabs';
import ProjectSelectorNavigator from '#~/concepts/projects/ProjectSelectorNavigator';
import { ProjectObjectType } from '#~/concepts/design/utils';

const title = 'Workload metrics';
const description = 'Monitor the metrics of your active resources.';
const deprecationMessage =
  "We've updated Distributed workloads to enable a more comprehensive view of running workloads.";

type GlobalDistributedWorkloadsProps = {
  activeTab: DistributedWorkloadsTabConfig;
  getInvalidRedirectPath: (namespace: string) => string;
};

type InfrastructureWorkloadsLinkProps = {
  infrastructureAvailable: boolean;
};

export const InfrastructureWorkloadsLink: React.FC<InfrastructureWorkloadsLinkProps> = ({
  infrastructureAvailable,
}) =>
  infrastructureAvailable ? (
    <Link to="/observe-and-monitor/infrastructure" state={{ tab: 'workloads' }}>
      Workloads page
    </Link>
  ) : (
    <>Workloads page</>
  );

const GlobalDistributedWorkloads: React.FC<GlobalDistributedWorkloadsProps> = ({
  activeTab,
  getInvalidRedirectPath,
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const infrastructureAvailable = useIsAreaAvailable(SupportedArea.GPUAAS_INFRASTRUCTURE).status;
  const storedProject = getStoredPreferredProject(projects);

  if (projects.length === 0) {
    return (
      <ApplicationsPage
        title={<TitleWithIcon title={title} objectType={ProjectObjectType.distributedWorkload} />}
        description={description}
        loaded
        empty
        emptyStatePage={<DistributedWorkloadsNoProjects />}
      />
    );
  }
  if (!namespace) {
    const redirectProject = storedProject ?? preferredProject ?? projects[0];
    return <Navigate to={getInvalidRedirectPath(redirectProject.metadata.name)} replace />;
  }
  if (namespace && !projects.find(byName(namespace))) {
    // The namespace in the URL is invalid
    return (
      <ApplicationsPage
        title={<TitleWithIcon title={title} objectType={ProjectObjectType.distributedWorkload} />}
        description={description}
        loaded
        empty
        emptyStatePage={
          <InvalidProject namespace={namespace} getRedirectPath={getInvalidRedirectPath} />
        }
      />
    );
  }

  // We're all good, we have a namespace matching a known project
  return (
    <ApplicationsPage
      title={<TitleWithIcon title={title} objectType={ProjectObjectType.distributedWorkload} />}
      description={description}
      loaded
      empty={false}
      headerContent={
        <ProjectSelectorNavigator
          getRedirectPath={(ns: string) =>
            `/observe-monitor/workload-metrics/${activeTab.path}/${ns}`
          }
          showTitle
        />
      }
    >
      <MetricsCommonContextProvider initialRefreshInterval={RefreshIntervalTitle.THIRTY_MINUTES}>
        <PageSection className="pf-v6-u-py-0">
          <Alert isInline variant="warning" title="This page is being deprecated.">
            {deprecationMessage} To view all workloads in your project, go to the new{' '}
            <InfrastructureWorkloadsLink infrastructureAvailable={infrastructureAvailable} /> in
            Observe &amp; monitor &gt; Infrastructure.
          </Alert>
        </PageSection>
        <DistributedWorkloadsContextProvider namespace={namespace}>
          <GlobalDistributedWorkloadsTabs activeTabId={activeTab.id} />
        </DistributedWorkloadsContextProvider>
      </MetricsCommonContextProvider>
    </ApplicationsPage>
  );
};

export default GlobalDistributedWorkloads;
