import * as React from 'react';
import { Button } from '@patternfly/react-core';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import { getRoleDisplayName } from '#~/concepts/permissions/utils';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import RoleDetailsModal from '#~/pages/projects/projectPermissions/roleDetails/RoleDetailsModal';
import { getRoleTypeForTracking } from '#~/pages/projects/projectPermissions/trackingUtils';

type RoleDetailsLinkProps = {
  roleRef: RoleRef;
  role?: RoleKind | ClusterRoleKind;
};

const RoleDetailsLink: React.FC<RoleDetailsLinkProps> = ({ roleRef, role }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClick = () => {
    /* eslint-disable camelcase */
    fireMiscTrackingEvent('RBAC Role Details Clicked', {
      role_type: getRoleTypeForTracking(roleRef, role),
      cluster_role: roleRef.kind === 'ClusterRole',
    });
    /* eslint-enable camelcase */
    setIsOpen(true);
  };

  return (
    <>
      <Button variant="link" isInline onClick={handleClick} data-testid="role-link">
        {getRoleDisplayName(roleRef, role)}
      </Button>
      {isOpen ? <RoleDetailsModal roleRef={roleRef} onClose={() => setIsOpen(false)} /> : null}
    </>
  );
};

export default RoleDetailsLink;
