import * as React from 'react';
import {
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalHeader,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import {
  getRoleByRef,
  getRoleDescription,
  getRoleDisplayName,
} from '#~/concepts/permissions/utils';
import type { RoleRef } from '#~/concepts/permissions/types';
import RoleLabel from '#~/pages/projects/projectPermissions/components/RoleLabel';
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
    <Modal
      isOpen
      variant="large"
      onClose={onClose}
      aria-label="Role details modal"
      data-testid="role-details-modal"
    >
      <ModalHeader
        title={
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>{getRoleDisplayName(roleRef, role)}</FlexItem>
            <FlexItem>
              <RoleLabel roleRef={roleRef} role={role} />
            </FlexItem>
          </Flex>
        }
        description={getRoleDescription(roleRef, role)}
      />
      <ModalBody>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(_e, key) => {
            if (isTabKey(key)) {
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
      </ModalBody>
    </Modal>
  );
};

export default RoleDetailsModal;
