import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { getRoleDisplayName } from '#~/concepts/permissions/utils';
import { isDashboardRole, isDefaultRoleRef } from '#~/pages/projects/projectPermissions/utils';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import type { SubjectRoleRow } from './types';

type SubjectRolesRemoveRoleModalProps = {
  row: SubjectRoleRow;
  isSubmitting: boolean;
  error?: Error;
  onClose: () => void;
  onConfirm: () => void;
};

const SubjectRolesRemoveRoleModal: React.FC<SubjectRolesRemoveRoleModalProps> = ({
  row,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}) => {
  const roleDisplayName = getRoleDisplayName(row.roleRef, row.role);
  const isReversible = isDashboardRole(row.role) || isDefaultRoleRef(row.roleRef);
  return (
    <DeleteModal
      title="Unassign role?"
      onClose={onClose}
      deleting={isSubmitting}
      onDelete={onConfirm}
      deleteName={row.subjectName}
      submitButtonLabel="Unassign role"
      error={error}
      typeConfirmationLabel="unassignment"
      removeConfirmation={isReversible}
    >
      <Stack hasGutter>
        {!isReversible ? (
          <StackItem>
            The <strong>{roleDisplayName}</strong> role was assigned to{' '}
            <strong>{row.subjectName}</strong> from OpenShift. It cannot be reassigned from{' '}
            {ODH_PRODUCT_NAME}.
          </StackItem>
        ) : null}
        <StackItem>
          <strong>{row.subjectName}</strong> will lose all permissions associated with the{' '}
          <strong>{roleDisplayName}</strong> role.
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default SubjectRolesRemoveRoleModal;
