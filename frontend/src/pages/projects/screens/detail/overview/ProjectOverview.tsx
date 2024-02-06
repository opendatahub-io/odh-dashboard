import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import emptyStateImg from '~/images/empty-state-projects-overview.svg';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import NotebookCard from '~/pages/projects/screens/detail/overview/NotebookCard';
import ClusterStorageCard from '~/pages/projects/screens/detail/overview/ClusterStorageCard';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import PipelineCard from '~/pages/projects/screens/detail/overview/PipelineCard';
import ModelServerCard from '~/pages/projects/screens/detail/overview/ModelServerCard';
import DataConnectionCard from '~/pages/projects/screens/detail/overview/DataConnectionCard';
import UserGroupsCard from '~/pages/projects/screens/detail/overview/UserGroupsCard';
import ProjectMetrics from '~/pages/projects/screens/detail/overview/ProjectMetrics';
import MetricCards from '~/pages/projects/screens/detail/overview/MetricCards';

import './ProjectOverview.scss';

const ProjectOverview: React.FC = () => {
  const {
    currentProject,
    notebooks: { data: notebookStates, loaded: notebooksLoaded },
    pvcs: { data: pvcs, loaded: pvcsLoaded },
    servingRuntimes: { data: modelServers, loaded: modelServersLoaded },
    dataConnections: { data: dataConnections, loaded: dataConnectionsLoaded },
  } = React.useContext(ProjectDetailsContext);
  const [allowCreate, rbacLoaded] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });
  const [{ totalSize: pipelinesCount }, pipelinesLoaded] = usePipelines({ pageSize: 1 });
  const isEmptyProject =
    notebookStates.length === 0 &&
    pvcs.length === 0 &&
    pipelinesCount === 0 &&
    dataConnections.length === 0 &&
    modelServers.length === 0;

  const loading =
    !notebooksLoaded ||
    !pipelinesLoaded ||
    !pvcsLoaded ||
    !modelServersLoaded ||
    !dataConnectionsLoaded;

  const emptyProjectContent = () => {
    if (loading) {
      return (
        <div className="odh-project-overview__loading">
          <Spinner size="xl" />
        </div>
      );
    }
    return (
      <div className="odh-project-overview__content">
        <div className="odh-project-overview__project">
          <EmptyState variant="xs">
            <EmptyStateHeader
              titleText={<>Start by building out your project</>}
              icon={<EmptyStateIcon icon={() => <img src={emptyStateImg} alt="Workbenches" />} />}
              headingLevel="h3"
            />
            <EmptyStateBody>
              From workbenches to model servers, your data science project can be organized and
              customized to meet your needs.
            </EmptyStateBody>
          </EmptyState>
        </div>
        <div className="odh-project-overview__components">
          <NotebookCard allowCreate={rbacLoaded && allowCreate} />
          <PipelineCard allowCreate={rbacLoaded && allowCreate} />
          <ClusterStorageCard allowCreate={rbacLoaded && allowCreate} />
          <ModelServerCard />
          <DataConnectionCard allowCreate={rbacLoaded && allowCreate} />
          <UserGroupsCard />
        </div>
      </div>
    );
  };

  return (
    <PageSection
      className="odh-project-overview"
      isFilled
      aria-label="project-details-page-section"
      variant="light"
    >
      {loading || isEmptyProject ? (
        emptyProjectContent()
      ) : (
        <div className="odh-project-overview__metrics">
          <MetricCards />
          <ProjectMetrics />
        </div>
      )}
    </PageSection>
  );
};

export default ProjectOverview;
