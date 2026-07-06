import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  TabContentBody,
} from '@patternfly/react-core';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import { getRoleAssignmentsForRoleRef } from '#~/concepts/permissions/utils';
import type { RoleRef } from '#~/concepts/permissions/types';
import RoleAssigneesTable from './RoleAssigneesTable';

type RoleDetailsModalAssigneesTabProps = {
  roleRef: RoleRef;
};

const RoleDetailsModalAssigneesTab: React.FC<RoleDetailsModalAssigneesTabProps> = ({ roleRef }) => {
  const { roleBindings } = usePermissionsContext();

  const roleAssignments = React.useMemo(
    () => getRoleAssignmentsForRoleRef(roleBindings.data, roleRef),
    [roleBindings.data, roleRef],
  );

  if (roleAssignments.length === 0) {
    return (
      <TabContentBody hasPadding data-testid="role-assignees-tab">
        <EmptyState
          headingLevel="h3"
          titleText="No assignees"
          variant={EmptyStateVariant.sm}
          data-testid="role-details-assignees-empty"
        >
          <EmptyStateBody>No users or groups have this role assigned.</EmptyStateBody>
        </EmptyState>
      </TabContentBody>
    );
  }

  return (
    <TabContentBody hasPadding data-testid="role-assignees-tab">
      <RoleAssigneesTable roleAssignments={roleAssignments} />
    </TabContentBody>
  );
};

export default RoleDetailsModalAssigneesTab;
