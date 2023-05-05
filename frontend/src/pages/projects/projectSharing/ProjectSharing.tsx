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
import { GroupKind } from '~/k8sTypes';
import { ProjectSharingRBType } from './types';
import ProjectSharingTableSection from './ProjectSharingTableSection';
import { filterRoleBindingSubjects } from './utils';

const ProjectSharing: React.FC = () => {
  const {
    projectSharingRB: { data: roleBindings, loaded, error: loadError, refresh: refreshRB },
    groups: { data: groups },
  } = React.useContext(ProjectDetailsContext);

  if (loadError) {
    return (
      <EmptyState variant={EmptyStateVariant.large} data-id="error-empty-state">
        <EmptyStateIcon icon={ExclamationCircleIcon} />
        <Title headingLevel="h2" size="lg">
          There was an issue loading permissions.
        </Title>
        <EmptyStateBody>{loadError.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!loaded) {
    return (
      <EmptyState variant={EmptyStateVariant.large} data-id="loading-empty-state">
        <Spinner size="xl" />
        <Title headingLevel="h2" size="lg">
          Loading
        </Title>
      </EmptyState>
    );
  }

  return (
    <PageSection isFilled aria-label="project-sharing-page-section" variant="light">
      <Stack hasGutter>
        <StackItem>Add users and groups that can access the project. project.</StackItem>
        <StackItem>
          <ProjectSharingTableSection
            roleBindings={filterRoleBindingSubjects(roleBindings, ProjectSharingRBType.USER)}
            projectSharingTableType={ProjectSharingRBType.USER}
            refresh={refreshRB}
          />
        </StackItem>
        <StackItem>
          <ProjectSharingTableSection
            roleBindings={filterRoleBindingSubjects(roleBindings, ProjectSharingRBType.GROUP)}
            projectSharingTableType={ProjectSharingRBType.GROUP}
            refresh={refreshRB}
            typeAhead={
              groups.length > 0 ? groups.map((group: GroupKind) => group.metadata.name) : undefined
            }
          />
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default ProjectSharing;
