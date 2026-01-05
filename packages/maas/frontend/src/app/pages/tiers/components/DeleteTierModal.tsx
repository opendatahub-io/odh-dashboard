import * as React from 'react';
import { Tier } from '~/app/types/tier';
import DeleteModal from '~/app/shared/DeleteModal';
import useDeleteTier from '~/app/hooks/useDeleteTier';

type DeleteTierModalProps = {
  tier: Tier;
  onClose: (deleted?: boolean) => void;
};

const DeleteTierModal: React.FC<DeleteTierModalProps> = ({ tier, onClose }) => {
  const { isDeleting, error, deleteTierCallback } = useDeleteTier();

  const handleDelete = React.useCallback(async () => {
    try {
      await deleteTierCallback(tier.name);
      onClose(true);
    } catch {
      // Error is handled by the hook and displayed in the modal
    }
  }, [deleteTierCallback, tier.name, onClose]);

  return (
    <DeleteModal
      title="Delete tier?"
      onClose={() => {
        onClose();
      }}
      deleting={isDeleting}
      onDelete={handleDelete}
      submitButtonLabel="Delete"
      deleteName={tier.name}
      error={error ? new Error(error) : undefined}
    >
      This action cannot be undone. This will delete the <strong>{tier.displayName}</strong> tier
      for all users.
    </DeleteModal>
  );
};

export default DeleteTierModal;
