import * as React from 'react';
import { Tier } from '~/app/types/tier';
import DeleteModal from '~/app/shared/DeleteModal';

type DeleteTierModalProps = {
  tier: Tier;
  onClose: (deleted?: boolean) => void;
};

const DeleteTierModal: React.FC<DeleteTierModalProps> = ({ tier, onClose }) => (
  <DeleteModal
    title="Delete tier?"
    onClose={() => {
      onClose();
    }}
    deleting={false}
    onDelete={() => {
      onClose();
    }}
    submitButtonLabel="Delete"
    deleteName={tier.name}
  >
    This action cannot be undone. This will delete the <strong>{tier.displayName}</strong> tier for
    all users.
  </DeleteModal>
);

export default DeleteTierModal;
