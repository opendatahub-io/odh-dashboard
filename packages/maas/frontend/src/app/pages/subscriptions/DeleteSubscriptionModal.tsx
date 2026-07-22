import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import DeleteModal from '~/app/shared/DeleteModal';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { useDeleteSubscription } from '~/app/hooks/useDeleteSubscription';

type DeleteSubscriptionModalProps = {
  subscription: MaaSSubscription;
  onClose: (deleted?: boolean) => void;
};

const DeleteSubscriptionModal: React.FC<DeleteSubscriptionModalProps> = ({
  subscription,
  onClose,
}) => {
  const { isDeleting, error, deleteSubscriptionCallback } = useDeleteSubscription();
  if (!subscription.name) {
    return null;
  }

  return (
    <DeleteModal
      title="Delete Subscription?"
      onClose={() => {
        onClose();
      }}
      deleting={isDeleting}
      onDelete={async () => {
        await deleteSubscriptionCallback(subscription.name);
        onClose(true);
      }}
      submitButtonLabel="Delete"
      deleteName={subscription.displayName || subscription.name}
      error={error}
      genericLabel
      testId="delete-subscription-modal"
    >
      <Stack hasGutter>
        <StackItem data-testid="delete-modal-confirmation-message">
          Are you sure you want to delete the Subscription{' '}
          <strong>{subscription.displayName || subscription.name}</strong>?
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteSubscriptionModal;
