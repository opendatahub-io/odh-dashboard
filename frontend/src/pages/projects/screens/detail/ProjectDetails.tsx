import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Divider,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import GenericSidebar from '~/pages/projects/components/GenericSidebar';
import { useAppContext } from '~/app/AppContext';
import ServingRuntimeList from '~/pages/modelServing/screens/projects/ServingRuntimeList';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectDescription, getProjectDisplayName } from '~/pages/projects/utils';
import { featureFlagEnabled } from '~/utilities/utils';
import NotebooksList from './notebooks/NotebookList';
import { ProjectSectionID } from './types';
import StorageList from './storage/StorageList';
import { ProjectSectionTitles, ProjectSectionTitlesExtended } from './const';
import DataConnectionsList from './data-connections/DataConnectionsList';
import useCheckLogoutParams from './useCheckLogoutParams';

type SectionType = {
  id: ProjectSectionID;
  component: React.ReactNode;
  isEmpty: boolean;
};

const ProjectDetails: React.FC = () => {
  const {
    currentProject,
    notebooks: { data: notebookStates, loaded: notebookStatesLoaded },
    pvcs: { data: pvcs, loaded: pvcsLoaded },
    dataConnections: { data: connections, loaded: connectionsLoaded },
    servingRuntimes: { data: modelServers, loaded: modelServersLoaded },
  } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);
  const description = getProjectDescription(currentProject);
  const { dashboardConfig } = useAppContext();
  const modelServingEnabled = featureFlagEnabled(
    dashboardConfig.spec.dashboardConfig.disableModelServing,
  );
  useCheckLogoutParams();

  const scrollableSelectorID = 'project-details-list';
  const sections: SectionType[] = [
    {
      id: ProjectSectionID.WORKBENCHES,
      component: <NotebooksList />,
      isEmpty: notebookStatesLoaded && notebookStates.length === 0,
    },
    {
      id: ProjectSectionID.CLUSTER_STORAGES,
      component: <StorageList />,
      isEmpty: pvcsLoaded && pvcs.length === 0,
    },
    {
      id: ProjectSectionID.DATA_CONNECTIONS,
      component: <DataConnectionsList />,
      isEmpty: connectionsLoaded && connections.length === 0,
    },
    ...(modelServingEnabled
      ? [
          {
            id: ProjectSectionID.MODEL_SERVER,
            component: <ServingRuntimeList />,
            isEmpty: modelServersLoaded && modelServers.length === 0,
          },
        ]
      : []),
  ];

  return (
    <ApplicationsPage
      title={displayName}
      description={description}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/projects">Data science projects</Link>} />
          <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection
        id={scrollableSelectorID}
        hasOverflowScroll
        isFilled
        aria-label="project-details-page-section"
        variant="light"
      >
        <GenericSidebar
          sections={Object.keys(
            modelServingEnabled
              ? { ...ProjectSectionTitles, ...ProjectSectionTitlesExtended }
              : ProjectSectionTitles,
          )}
          titles={modelServingEnabled ? ProjectSectionTitlesExtended : ProjectSectionTitles}
          scrollableSelector={`#${scrollableSelectorID}`}
          maxWidth={175}
        >
          <Stack hasGutter>
            {sections.map(({ id, component, isEmpty }, index) => (
              <React.Fragment key={id}>
                <StackItem
                  id={id}
                  aria-label={ProjectSectionTitles[id]}
                  data-testid="details-page-section"
                >
                  {component}
                </StackItem>
                {index !== sections.length - 1 && isEmpty && (
                  <Divider data-testid="details-page-section-divider" />
                )}
              </React.Fragment>
            ))}
          </Stack>
        </GenericSidebar>
      </PageSection>
    </ApplicationsPage>
  );
};

export default ProjectDetails;
