import { Divider, PageSection, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { useParams } from 'react-router';
import ApplicationsPage from '../../../ApplicationsPage';
import EmptyProjects from '../../EmptyProjects';
import DataConnectionsList from './DataConnectionsList';
import ProjectDetailsSidebar from './ProjectDetailsSidebar';
import StorageList from './StorageList';
import { ProjectSectionID } from './types';
import WorkspacesList from './WorkspacesList';

type SectionType = {
  id: ProjectSectionID;
  component: React.ReactNode;
};

const ProjectDetails: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();

  const sections: SectionType[] = [
    { id: ProjectSectionID.WORKSPACE, component: <WorkspacesList /> },
    { id: ProjectSectionID.STORAGE, component: <StorageList /> },
    { id: ProjectSectionID.DATA_CONNECTIONS, component: <DataConnectionsList /> },
  ];

  const mapSections = (
    id: ProjectSectionID,
    component: React.ReactNode,
    index: number,
    array: SectionType[],
  ) => (
    <React.Fragment key={id}>
      <StackItem>{component}</StackItem>
      {index !== array.length - 1 && <Divider />}
    </React.Fragment>
  );

  return (
    <ApplicationsPage
      title={`${namespace} project details`}
      description={null}
      loaded
      empty={false}
      emptyStatePage={<EmptyProjects />}
    >
      <PageSection id="project-details-list" hasOverflowScroll variant="light">
        <ProjectDetailsSidebar>
          <Stack hasGutter>
            {sections.map(({ id, component }, index, array) =>
              mapSections(id, component, index, array),
            )}
          </Stack>
        </ProjectDetailsSidebar>
      </PageSection>
    </ApplicationsPage>
  );
};

export default ProjectDetails;
