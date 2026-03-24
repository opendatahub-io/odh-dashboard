import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import DeleteModal from '~/app/shared/DeleteModal';
import { MaaSSubscription } from '~/app/types/subscriptions';

type DeleteSubscriptionModalProps = {
  subscription: MaaSSubscription;
  onClose: (deleted?: boolean) => void;
};

const DeleteSubscriptionModal: React.FC<DeleteSubscriptionModalProps> = ({
  subscription,
  onClose,
}) => {
  if (!subscription.name) {
    return null;
  }

  return (
    <DeleteModal
      title="Delete Subscription?"
      onClose={() => {
        onClose();
      }}
      deleting={false}
      onDelete={() => {
        onClose(true);
      }}
      submitButtonLabel="Delete"
      deleteName={subscription.name}
      error={undefined}
      genericLabel
      data-testid="delete-subscription-modal"
    >
      <Stack hasGutter>
        <StackItem>
          Are you sure you want to delete the Subscription <strong>{subscription.name}</strong>?
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteSubscriptionModal;
