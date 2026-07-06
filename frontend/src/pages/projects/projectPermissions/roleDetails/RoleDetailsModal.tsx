import * as React from 'react';
import { Flex, FlexItem, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import {
  getRoleByRef,
  getRoleDescription,
  getRoleDisplayName,
} from '#~/concepts/permissions/utils';
import type { RoleRef } from '#~/concepts/permissions/types';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import ContentModal from '#~/components/modals/ContentModal';
import RoleLabel from '#~/pages/projects/projectPermissions/components/RoleLabel';
import { getRoleTypeForTracking } from '#~/pages/projects/projectPermissions/trackingUtils';
import RoleDetailsModalDetailsTab from './RoleDetailsModalDetailsTab';
import RoleDetailsModalAssigneesTab from './RoleDetailsModalAssigneesTab';

type RoleDetailsModalProps = {
  roleRef: RoleRef;
  onClose: () => void;
};

type TabKey = 'details' | 'assignees';
const isTabKey = (key: unknown): key is TabKey => key === 'details' || key === 'assignees';

const RoleDetailsModal: React.FC<RoleDetailsModalProps> = ({ roleRef, onClose }) => {
  const { roles, clusterRoles } = usePermissionsContext();

  const role = React.useMemo(
    () => getRoleByRef(roles.data, clusterRoles.data, roleRef),
    [clusterRoles.data, roleRef, roles.data],
  );

  const [activeTabKey, setActiveTabKey] = React.useState<TabKey>('details');

  React.useEffect(() => {
    setActiveTabKey('details');
  }, [roleRef.kind, roleRef.name]);

  return (
    <ContentModal
      variant="large"
      onClose={onClose}
      dataTestId="role-details-modal"
      title={
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>{getRoleDisplayName(roleRef, role)}</FlexItem>
          <FlexItem>
            <RoleLabel roleRef={roleRef} role={role} />
          </FlexItem>
        </Flex>
      }
      description={getRoleDescription(roleRef, role)}
      contents={
        <Tabs
          activeKey={activeTabKey}
          onSelect={(_e, key) => {
            if (isTabKey(key)) {
              if (key === 'assignees') {
                /* eslint-disable camelcase */
                fireMiscTrackingEvent('RBAC Role Assignees Clicked', {
                  role_type: getRoleTypeForTracking(roleRef, role),
                  cluster_role: roleRef.kind === 'ClusterRole',
                });
                /* eslint-enable camelcase */
              }
              setActiveTabKey(key);
            }
          }}
          aria-label="Role details tabs"
        >
          <Tab eventKey="details" title={<TabTitleText>Role details</TabTitleText>}>
            <RoleDetailsModalDetailsTab roleRef={roleRef} role={role} />
          </Tab>
          <Tab eventKey="assignees" title={<TabTitleText>Assignees</TabTitleText>}>
            <RoleDetailsModalAssigneesTab roleRef={roleRef} />
          </Tab>
        </Tabs>
      }
    />
  );
};

export default RoleDetailsModal;
