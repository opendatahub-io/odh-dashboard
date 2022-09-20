import { Divider, PageSection, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { useParams } from 'react-router';
import ApplicationsPage from '../../../ApplicationsPage';
import EmptyProjects from '../../EmptyProjects';
import DataConnectionsList from './DataConnectionsList';
import ModelServingList from './ModelServingList';
import ProjectDetailsSidebarWrapper from './ProjectDetailsSidebar';
import StorageList from './StorageList';
import WorkspacesList from './WorkspacesList';

const ProjectDetails: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();

  return (
    <ApplicationsPage
      title={`${namespace} project details`}
      description={null}
      loaded
      empty={false}
      emptyStatePage={<EmptyProjects />}
    >
      <PageSection id="project-details-list" hasOverflowScroll variant="light">
        <ProjectDetailsSidebarWrapper>
          <Stack hasGutter>
            <StackItem>
              <WorkspacesList />
            </StackItem>
            <Divider />
            <StackItem>
              <StorageList />
            </StackItem>
            <Divider />
            <StackItem>
              <DataConnectionsList />
            </StackItem>
            <Divider />
            <StackItem>
              <ModelServingList />
            </StackItem>
          </Stack>
        </ProjectDetailsSidebarWrapper>
      </PageSection>
    </ApplicationsPage>
  );
};

export default ProjectDetails;
