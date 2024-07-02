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
import { GroupKind, RoleBindingKind } from '~/k8sTypes';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ContextResourceData } from '~/types';
import { MODEL_REGISTRY_DEFAULT_NAMESPACE } from '~/concepts/modelRegistry/const';
import RoleBindingPermissionsTableSection from './RoleBindingPermissionsTableSection';
import { RoleBindingPermissionsRBType, RoleBindingPermissionsRoleType } from './types';
import { filterRoleBindingSubjects } from './utils';

type RoleBindingPermissionsProps = {
  roleBindingPermissionsRB: ContextResourceData<RoleBindingKind>;
  permissionOptions?: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  projectName: string;
  roleRef?: string;
  labels?: { [key: string]: string };
  description: React.ReactElement | string;
  groups: GroupKind[];
};

const RoleBindingPermissions: React.FC<RoleBindingPermissionsProps> = ({
  roleBindingPermissionsRB,
  permissionOptions,
  projectName,
  roleRef,
  labels,
  description,
  groups,
}) => {
  const {
    data: roleBindings,
    loaded,
    error: loadError,
    refresh: refreshRB,
  } = roleBindingPermissionsRB;
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

  const userTable = (
    <RoleBindingPermissionsTableSection
      projectName={projectName}
      roleRef={roleRef}
      labels={labels}
      permissionOptions={permissionOptions}
      roleBindings={filterRoleBindingSubjects(roleBindings, RoleBindingPermissionsRBType.USER)}
      roleBindingPermissionsTableType={RoleBindingPermissionsRBType.USER}
      refresh={refreshRB}
      typeModifier="user"
    />
  );

  const groupTable = (
    <RoleBindingPermissionsTableSection
      projectName={projectName}
      roleRef={roleRef}
      permissionOptions={permissionOptions}
      labels={labels}
      roleBindings={filterRoleBindingSubjects(roleBindings, RoleBindingPermissionsRBType.GROUP)}
      roleBindingPermissionsTableType={RoleBindingPermissionsRBType.GROUP}
      refresh={refreshRB}
      typeAhead={
        groups.length > 0 ? groups.map((group: GroupKind) => group.metadata.name) : undefined
      }
      typeModifier="group"
    />
  );

  return (
    <PageSection
      isFilled
      aria-label="project-sharing-page-section"
      variant="light"
      id={ProjectSectionID.PERMISSIONS}
    >
      <Stack hasGutter>
        <StackItem>{description}</StackItem>
        <StackItem>
          {projectName === MODEL_REGISTRY_DEFAULT_NAMESPACE ? groupTable : userTable}
        </StackItem>
        <StackItem>
          {projectName === MODEL_REGISTRY_DEFAULT_NAMESPACE ? userTable : groupTable}
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default RoleBindingPermissions;
