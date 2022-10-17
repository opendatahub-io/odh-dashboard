import { Breadcrumb, BreadcrumbItem, PageSection, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';
import ApplicationsPage from '../../../ApplicationsPage';
import DataConnectionsList from './data-connections/DataConnectionsList';
import { ProjectSectionTitles, ProjectSectionTitlesExtended } from './const';
import GenericSidebar from '../../components/GenericSidebar';
import StorageList from './storage/StorageList';
import { ProjectSectionID } from './types';
import NotebookList from './notebooks/NotebookList';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import { getProjectDescription, getProjectDisplayName } from '../../utils';
import ModelServerList from './ModelServerList';
import { useAppContext } from 'app/AppContext';

type SectionType = {
  id: ProjectSectionID;
  component: React.ReactNode;
};

const ProjectDetails: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);
  const description = getProjectDescription(currentProject);
  const { dashboardConfig } = useAppContext();
  const modelServingEnabled = dashboardConfig.spec.dashboardConfig.disableModelServing;

  const scrollableSelectorID = 'project-details-list';
  const sections: SectionType[] = [
    { id: ProjectSectionID.WORKBENCHES, component: <NotebookList /> },
    { id: ProjectSectionID.CLUSTER_STORAGES, component: <StorageList /> },
    { id: ProjectSectionID.DATA_CONNECTIONS, component: <DataConnectionsList /> },
    ...(!modelServingEnabled
      ? [{ id: ProjectSectionID.MODEL_SERVER, component: <ModelServerList /> }]
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
              ? ProjectSectionTitles
              : { ...ProjectSectionTitles, ...ProjectSectionTitlesExtended },
          )}
          titles={modelServingEnabled ? ProjectSectionTitles : ProjectSectionTitlesExtended}
          scrollableSelector={`#${scrollableSelectorID}`}
          maxWidth={175}
        >
          <Stack hasGutter>
            {sections.map(({ id, component }) => (
              <StackItem key={id} id={id} aria-label={ProjectSectionTitles[id]}>
                {component}
              </StackItem>
            ))}
          </Stack>
        </GenericSidebar>
      </PageSection>
    </ApplicationsPage>
  );
};

export default ProjectDetails;
