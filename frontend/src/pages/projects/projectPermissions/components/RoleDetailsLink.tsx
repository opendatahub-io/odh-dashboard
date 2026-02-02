import * as React from 'react';
import { Button } from '@patternfly/react-core';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import { getRoleDisplayName } from '#~/concepts/permissions/utils';
import RoleDetailsModal from '#~/pages/projects/projectPermissions/roleDetails/RoleDetailsModal';

type RoleDetailsLinkProps = {
  roleRef: RoleRef;
  role?: RoleKind | ClusterRoleKind;
  showAssigneesTab?: boolean;
};

const RoleDetailsLink: React.FC<RoleDetailsLinkProps> = ({ roleRef, role, showAssigneesTab }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <Button variant="link" isInline onClick={() => setIsOpen(true)} data-testid="role-link">
        {getRoleDisplayName(roleRef, role)}
      </Button>
      {isOpen ? (
        <RoleDetailsModal
          roleRef={roleRef}
          onClose={() => setIsOpen(false)}
          showAssigneesTab={showAssigneesTab}
        />
      ) : null}
    </>
  );
};

export default RoleDetailsLink;
