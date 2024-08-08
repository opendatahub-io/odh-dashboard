import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  PageSection,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import {
  RoleBindingPermissionsRBType,
  RoleBindingPermissionsRoleType,
} from '~/concepts/roleBinding/types';
import { filterRoleBindingSubjects, removePrefix } from '~/concepts/roleBinding/utils';
import { RoleBindingKind, RoleBindingRoleRef } from '~/k8sTypes';
import { ContextResourceData } from '~/types';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import RoleBindingPermissionsTableSection from '~/concepts/roleBinding/RoleBindingPermissionsTableSection';

type RoleBindingProjectPermissionsProps = {
  ownerReference?: K8sResourceCommon;
  roleBindingPermissionsRB: ContextResourceData<RoleBindingKind>;
  permissionOptions: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  projectName: string;
  roleRefName?: RoleBindingRoleRef['name'];
  labels?: { [key: string]: string };
  isProjectSubject?: boolean;
  description: string;
};

const ProjectsSettingsTab: React.FC<RoleBindingProjectPermissionsProps> = ({
  ownerReference,
  roleBindingPermissionsRB,
  permissionOptions,
  projectName,
  roleRefName,
  labels,
  isProjectSubject,
  description,
}) => {
  const {
    data: roleBindings,
    loaded,
    error: loadError,
    refresh: refreshRB,
  } = roleBindingPermissionsRB;

  const { projects } = React.useContext(ProjectsContext);
  const filteredProjects = projects.filter(
    (project) => !removePrefix(roleBindings).includes(project.metadata.name),
  );

  if (loadError) {
    return (
      <EmptyState
        variant={EmptyStateVariant.lg}
        data-id="error-empty-state"
        id={ProjectSectionID.PERMISSIONS}
      >
        <EmptyStateHeader
          titleText="There was an issue loading projects"
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
    <PageSection isFilled variant="light">
      <Stack hasGutter>
        <StackItem>{description}</StackItem>
        <StackItem>
          <RoleBindingPermissionsTableSection
            ownerReference={ownerReference}
            roleBindings={filterRoleBindingSubjects(
              roleBindings,
              RoleBindingPermissionsRBType.GROUP,
              isProjectSubject,
            )}
            projectName={projectName}
            roleRefKind="Role"
            roleRefName={roleRefName}
            labels={labels}
            subjectKind={RoleBindingPermissionsRBType.GROUP}
            permissionOptions={permissionOptions}
            typeAhead={
              filteredProjects.length > 0
                ? filteredProjects.map((project) => project.metadata.name)
                : undefined
            }
            refresh={refreshRB}
            typeModifier="project"
            isProjectSubject={isProjectSubject}
          />
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default ProjectsSettingsTab;
