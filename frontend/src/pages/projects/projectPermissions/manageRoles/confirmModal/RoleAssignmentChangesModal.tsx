import * as React from 'react';
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { isAiRole } from '#~/pages/projects/projectPermissions/utils';
import type { RoleAssignmentChanges } from '#~/pages/projects/projectPermissions/manageRoles/types';
import RoleChangesSection from './RoleChangesSection';

type RoleAssignmentChangesModalProps = {
  subjectName: string;
  changes: RoleAssignmentChanges;
  onClose: () => void;
  onConfirm: () => void;
};

const RoleAssignmentChangesModal: React.FC<RoleAssignmentChangesModalProps> = ({
  subjectName,
  changes,
  onClose,
  onConfirm,
}) => {
  const hasCustomRoleUnassignments = changes.unassigning.some(
    (row) => !isAiRole(row.roleRef, row.role),
  );
  const assigningCount = changes.assigning.length;
  const unassigningCount = changes.unassigning.length;

  return (
    <Modal
      isOpen
      variant="small"
      onClose={onClose}
      aria-label="Confirm role assignment changes modal"
      data-testid="assign-roles-confirm-modal"
    >
      <ModalHeader title="Confirm role assignment changes?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            The following role updates apply to <strong>{subjectName}</strong>:{' '}
            {assigningCount > 0 && (
              <>
                <strong>
                  {assigningCount} role{assigningCount !== 1 ? 's' : ''}
                </strong>{' '}
                will be newly assigned
              </>
            )}
            {assigningCount > 0 && unassigningCount > 0 && ' and '}
            {unassigningCount > 0 && (
              <>
                <strong>
                  {unassigningCount} role{unassigningCount !== 1 ? 's' : ''}
                </strong>{' '}
                will be unassigned
              </>
            )}
            . Please review and confirm your changes to avoid unintended permission
            misconfigurations.
          </StackItem>
          <StackItem>
            <Stack hasGutter>
              <StackItem>
                <RoleChangesSection
                  label="Assigning roles"
                  rows={changes.assigning}
                  testId="assign-roles-confirm-assigning-section"
                />
              </StackItem>
              <StackItem>
                <RoleChangesSection
                  label="Unassigning roles"
                  rows={changes.unassigning}
                  testId="assign-roles-confirm-unassigning-section"
                />
              </StackItem>
            </Stack>
          </StackItem>
          {hasCustomRoleUnassignments && (
            <StackItem>
              <Alert
                isInline
                variant="danger"
                title={
                  <span style={{ fontWeight: 'var(--pf-t--global--font--weight--body--default)' }}>
                    The OpenShift custom roles were assigned from OpenShift. You need to contact
                    your admin to reassign them outside the {ODH_PRODUCT_NAME} once you unassign
                    them.
                  </span>
                }
              />
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onConfirm} data-testid="assign-roles-confirm-save">
          Confirm
        </Button>
        <Button variant="link" onClick={onClose} data-testid="assign-roles-confirm-cancel">
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RoleAssignmentChangesModal;
