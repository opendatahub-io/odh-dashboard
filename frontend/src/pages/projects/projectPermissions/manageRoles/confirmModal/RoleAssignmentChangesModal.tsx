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
  onConfirm: () => Promise<void>;
};

const RoleAssignmentChangesModal: React.FC<RoleAssignmentChangesModalProps> = ({
  subjectName,
  changes,
  onClose,
  onConfirm,
}) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to save role assignments'));
      setIsSaving(false);
    }
  };

  const hasCustomRoleUnassignments = changes.unassigning.some(
    (row) => !isAiRole(row.roleRef, row.role),
  );
  const assigningCount = changes.assigning.length;
  const unassigningCount = changes.unassigning.length;

  return (
    <Modal
      isOpen
      variant="small"
      onClose={isSaving ? undefined : onClose}
      onEscapePress={isSaving ? undefined : onClose}
      aria-label="Confirm role assignment changes modal"
      data-testid="assign-roles-confirm-modal"
    >
      <ModalHeader title="Save role assignment changes?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            The following role assignment changes will be applied to the user{' '}
            <strong>{subjectName}</strong>.
          </StackItem>
          <StackItem>
            <Stack hasGutter>
              {changes.assigning.length > 0 && (
                <StackItem>
                  <RoleChangesSection
                    label={`Assigning ${assigningCount} role${assigningCount !== 1 ? 's' : ''}`}
                    rows={changes.assigning}
                    testId="assign-roles-confirm-assigning-section"
                  />
                </StackItem>
              )}
              {changes.unassigning.length > 0 && (
                <StackItem>
                  <RoleChangesSection
                    label={`Unassigning ${unassigningCount} role${
                      unassigningCount !== 1 ? 's' : ''
                    }`}
                    rows={changes.unassigning}
                    testId="assign-roles-confirm-unassigning-section"
                  />
                </StackItem>
              )}
            </Stack>
          </StackItem>
          {hasCustomRoleUnassignments && (
            <StackItem>
              <Alert
                isInline
                variant="danger"
                data-testid="assign-roles-confirm-custom-role-warning"
                title="Roles cannot be reassigned "
              >
                OpenShift custom roles cannot be assigned from {ODH_PRODUCT_NAME}. To reassign this
                role after removing it, you or an administrator must do so from OpenShift.
              </Alert>
            </StackItem>
          )}
          {error && (
            <StackItem>
              <Alert
                isInline
                variant="danger"
                title="Failed to save role assignments"
                data-testid="assign-roles-confirm-error"
              >
                {error.message}
              </Alert>
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleConfirm}
          isLoading={isSaving}
          isDisabled={isSaving}
          data-testid="assign-roles-confirm-save"
        >
          Confirm
        </Button>
        <Button
          variant="link"
          onClick={onClose}
          isDisabled={isSaving}
          data-testid="assign-roles-confirm-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RoleAssignmentChangesModal;
