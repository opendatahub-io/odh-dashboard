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
  EmptyStateHeader,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { GroupKind } from '~/k8sTypes';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import ProjectSharingTableSection from './ProjectSharingTableSection';
import { ProjectSharingRBType } from './types';
import { filterRoleBindingSubjects } from './utils';

const ProjectSharing: React.FC = () => {
  const {
    projectSharingRB: { data: roleBindings, loaded, error: loadError, refresh: refreshRB },
    groups: { data: groups },
  } = React.useContext(ProjectDetailsContext);

  if (loadError) {
    return (
      <EmptyState
        variant={EmptyStateVariant.lg}
        data-id="error-empty-state"
        id={ProjectSectionID.PERMISSIONS}
      >
        <EmptyStateHeader
          titleText="There was an issue loading permissions."
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
          headingLevel="h2"
        />
        <EmptyStateBody>{loadError.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!loaded) {
    return (
      <EmptyState
        variant={EmptyStateVariant.lg}
        data-id="loading-empty-state"
        id={ProjectSectionID.PERMISSIONS}
      >
        <Spinner size="xl" />
        <EmptyStateHeader titleText="Loading" headingLevel="h2" />
      </EmptyState>
    );
  }

  return (
    <PageSection
      isFilled
      aria-label="project-sharing-page-section"
      variant="light"
      id={ProjectSectionID.PERMISSIONS}
    >
      <Stack hasGutter>
        <StackItem>Add users and groups that can access the project.</StackItem>
        <StackItem>
          <ProjectSharingTableSection
            roleBindings={filterRoleBindingSubjects(roleBindings, ProjectSharingRBType.USER)}
            projectSharingTableType={ProjectSharingRBType.USER}
            refresh={refreshRB}
            typeModifier="user"
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
            typeModifier="group"
          />
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default ProjectSharing;
