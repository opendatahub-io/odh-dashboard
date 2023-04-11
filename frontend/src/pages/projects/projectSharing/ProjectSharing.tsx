import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import ProjectSharingTable from './ProjectSharingTable';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { type } from 'os';
import { ProjectSharingTableType } from './types';

const ProjectSharing: React.FC = () => {
  const {
    projectSharingRB: { data: roleBindings, loaded, error: loadError, refresh: refreshRB },
    refreshAllProjectData: refresh,
  } = React.useContext(ProjectDetailsContext);

  React.useEffect(() => {
    console.log(roleBindings);
  }, [roleBindings]);

  if (loadError) {
    return (
      <PageSection isFilled aria-label="project-sharing-error-section" variant="light">
        <EmptyState variant={EmptyStateVariant.large} data-id="error-empty-state">
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h4" size="lg">
            There was an issue loading permissions.
          </Title>
          <EmptyStateBody>{loadError.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (!loaded) {
    return (
      <PageSection isFilled aria-label="project-sharing-loading-section" variant="light">
        <EmptyState variant={EmptyStateVariant.large} data-id="loading-empty-state">
          <Spinner size="xl" />
          <Title headingLevel="h4" size="lg">
            Loading
          </Title>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection isFilled aria-label="project-sharing-page-section" variant="light">
      <Stack hasGutter>
        <StackItem>
          Add users and groups that can access the project. Edit allows users to view and make
          changes to the project. Admin allows users to also add and remove new users to the project
        </StackItem>
        <StackItem>
          <Stack hasGutter>
            <StackItem>
              <Title id={`user-permission`} headingLevel="h4" size="xl">
                Users
              </Title>
            </StackItem>
            <StackItem>
              {' '}
              <ProjectSharingTable permissions={roleBindings} type={ProjectSharingTableType.USER} refresh={() => {}} />
            </StackItem>
          </Stack>
        </StackItem>
        <StackItem>
          <Stack hasGutter>
            <StackItem>
              <Title id={`user-permission`} headingLevel="h4" size="xl">
                Group
              </Title>
            </StackItem>
            <StackItem>
              {' '}
              <ProjectSharingTable permissions={roleBindings} type={ProjectSharingTableType.GROUP} refresh={() => {}} />
            </StackItem>
          </Stack>
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default ProjectSharing;
