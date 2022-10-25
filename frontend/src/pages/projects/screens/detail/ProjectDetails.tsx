import { Breadcrumb, BreadcrumbItem, PageSection, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';
import ApplicationsPage from '../../../ApplicationsPage';
import DataConnectionsList from './data-connections/DataConnectionsList';
import { ProjectSectionTitles, ProjectSectionTitlesExtended } from './const';
import GenericSidebar from '../../components/GenericSidebar';
import StorageList from './storage/StorageList';
import { ProjectSectionID } from './types';
import WorkspacesList from './workspaces/WorkspacesList';
import { useAppContext } from 'app/AppContext';
import ModelServerList from './ModelServerList';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import { getProjectDescription, getProjectDisplayName } from '../../utils';

type SectionType = {
  id: ProjectSectionID;
  component: React.ReactNode;
};

const ProjectDetails: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);
  const description = getProjectDescription(currentProject);
  const modelServingEnabled = dashboardConfig.spec.dashboardConfig.disableModelServing;

  const scrollableSelectorID = 'project-details-list';
  const sections: SectionType[] = [
    { id: ProjectSectionID.WORKSPACES, component: <WorkspacesList /> },
    { id: ProjectSectionID.STORAGES, component: <StorageList /> },
    { id: ProjectSectionID.DATA_CONNECTIONS, component: <DataConnectionsList /> },
    ...(!modelServingEnabled
      ? [{ id: ProjectSectionID.MODEL_SERVER, component: <ModelServerList /> }]
      : []),
  ];

  return (
    <ApplicationsPage
      title={`${displayName} project details`}
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
              ? ProjectSectionTitles
              : { ...ProjectSectionTitles, ...ProjectSectionTitlesExtended },
          )}
          titles={modelServingEnabled ? ProjectSectionTitles : ProjectSectionTitlesExtended}
          scrollableSelector={`#${scrollableSelectorID}`}
          maxWidth={175}
        >
          <Stack hasGutter>
            {sections.map(({ id, component }) => (
              <React.Fragment key={id}>
                <StackItem>{component}</StackItem>
              </React.Fragment>
            ))}
          </Stack>
        </GenericSidebar>
      </PageSection>
    </ApplicationsPage>
  );
};

export default ProjectDetails;
