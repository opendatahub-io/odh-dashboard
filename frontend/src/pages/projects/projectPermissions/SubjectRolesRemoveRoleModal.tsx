import * as React from 'react';
import { Alert, Content, ContentVariants, Stack, StackItem } from '@patternfly/react-core';
import { getRoleDisplayName } from '#~/concepts/permissions/utils';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import type { SubjectRoleRow } from './types';
import { isReversibleRoleRef } from './utils';

type SubjectRolesRemoveRoleModalProps = {
  subjectKind: 'user' | 'group';
  row: SubjectRoleRow;
  isSubmitting: boolean;
  error?: Error;
  onClose: () => void;
  onConfirm: () => void;
};

const SubjectRolesRemoveRoleModal: React.FC<SubjectRolesRemoveRoleModalProps> = ({
  subjectKind,
  row,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}) => {
  const roleDisplayName = getRoleDisplayName(row.roleRef, row.role);
  const isReversible = isReversibleRoleRef(row.roleRef);
  return (
    <DeleteModal
      title="Remove role?"
      onClose={onClose}
      deleting={isSubmitting}
      onDelete={onConfirm}
      deleteName={row.subjectName}
      submitButtonLabel="Remove role"
      error={error}
      genericLabel
      removeConfirmation={isReversible}
    >
      <Stack hasGutter>
        {!isReversible ? (
          <StackItem>
            <Alert
              isInline
              variant="danger"
              title={
                <Content
                  component={ContentVariants.p}
                  style={{ fontWeight: 'var(--pf-t--global--font--weight--body--default)' }}
                >
                  The role <strong>{roleDisplayName}</strong> is granted in OpenShift. It cannot be
                  re-added in {ODH_PRODUCT_NAME} once it’s removed.
                </Content>
              }
            />
          </StackItem>
        ) : null}
        <StackItem>
          Once the role <strong>{roleDisplayName}</strong> is removed, all permissions associated
          with this role will not be granted to {subjectKind} <strong>{row.subjectName}</strong>.
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default SubjectRolesRemoveRoleModal;
