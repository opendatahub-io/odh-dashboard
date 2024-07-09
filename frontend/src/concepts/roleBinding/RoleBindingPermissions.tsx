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
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { GroupKind, RoleBindingKind, RoleBindingRoleRef } from '~/k8sTypes';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ContextResourceData } from '~/types';
import RoleBindingPermissionsTableSection from './RoleBindingPermissionsTableSection';
import { RoleBindingPermissionsRBType, RoleBindingPermissionsRoleType } from './types';
import { filterRoleBindingSubjects } from './utils';

type RoleBindingPermissionsProps = {
  ownerReference?: K8sResourceCommon;
  roleBindingPermissionsRB: ContextResourceData<RoleBindingKind>;
  defaultRoleBindingName?: string;
  permissionOptions: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  projectName: string;
  roleRefKind: RoleBindingRoleRef['kind'];
  roleRefName?: RoleBindingRoleRef['name'];
  labels?: { [key: string]: string };
  description: React.ReactElement | string;
  groups: GroupKind[];
  isGroupFirst?: boolean;
};

const RoleBindingPermissions: React.FC<RoleBindingPermissionsProps> = ({
  ownerReference,
  roleBindingPermissionsRB,
  defaultRoleBindingName,
  permissionOptions,
  projectName,
  roleRefKind,
  roleRefName,
  labels,
  description,
  groups,
  isGroupFirst = false,
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
      ownerReference={ownerReference}
      defaultRoleBindingName={defaultRoleBindingName}
      projectName={projectName}
      roleRefKind={roleRefKind}
      roleRefName={roleRefName}
      labels={labels}
      permissionOptions={permissionOptions}
      roleBindings={filterRoleBindingSubjects(roleBindings, RoleBindingPermissionsRBType.USER)}
      subjectKind={RoleBindingPermissionsRBType.USER}
      refresh={refreshRB}
      typeModifier="user"
    />
  );

  const groupTable = (
    <RoleBindingPermissionsTableSection
      ownerReference={ownerReference}
      defaultRoleBindingName={defaultRoleBindingName}
      projectName={projectName}
      roleRefKind={roleRefKind}
      roleRefName={roleRefName}
      permissionOptions={permissionOptions}
      labels={labels}
      roleBindings={filterRoleBindingSubjects(roleBindings, RoleBindingPermissionsRBType.GROUP)}
      subjectKind={RoleBindingPermissionsRBType.GROUP}
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
        <StackItem>{isGroupFirst ? groupTable : userTable}</StackItem>
        <StackItem>{isGroupFirst ? userTable : groupTable}</StackItem>
      </Stack>
    </PageSection>
  );
};

export default RoleBindingPermissions;
