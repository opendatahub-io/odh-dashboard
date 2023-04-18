import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ProjectSharingRBType } from './types';
import ProjectSharingTableSection from './ProjectSharingTableSection';

const ProjectSharing: React.FC = () => {
  const {
    projectSharingRB: { data: roleBindings, loaded, error: loadError, refresh: refreshRB },
    currentProject,
  } = React.useContext(ProjectDetailsContext);

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
          <ProjectSharingTableSection
            roleBindings={roleBindings}
            projectSharingTableType={ProjectSharingRBType.USER}
            refresh={refreshRB}
            namespace={currentProject.metadata.name}
          />
        </StackItem>
        <StackItem>
          <ProjectSharingTableSection
            roleBindings={roleBindings}
            projectSharingTableType={ProjectSharingRBType.GROUP}
            refresh={refreshRB}
            namespace={currentProject.metadata.name}
          />
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default ProjectSharing;
