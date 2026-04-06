import { Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import DeleteModal from '~/app/shared/DeleteModal';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { useDeleteAuthPolicy } from '~/app/hooks/useDeleteAuthPolicy';

type DeleteAuthPolicyModalProps = {
  authPolicy: MaaSAuthPolicy;
  onClose: (deleted?: boolean) => void;
};

const DeleteAuthPolicyModal: React.FC<DeleteAuthPolicyModalProps> = ({ authPolicy, onClose }) => {
  const { isDeleting, error, deleteAuthPolicyCallback } = useDeleteAuthPolicy();
  if (!authPolicy.name) {
    return null;
  }
  return (
    <DeleteModal
      title="Delete Policy?"
      onClose={() => {
        onClose();
      }}
      deleting={isDeleting}
      onDelete={async () => {
        await deleteAuthPolicyCallback(authPolicy.name);
        onClose(true);
      }}
      deleteName={authPolicy.name}
      genericLabel
      testId="delete-auth-policy-modal"
      error={error}
    >
      <Stack hasGutter>
        <StackItem>
          Are you sure you want to delete the Policy <strong>{authPolicy.name}</strong>?
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteAuthPolicyModal;
