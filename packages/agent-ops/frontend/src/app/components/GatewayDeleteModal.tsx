import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import type { APIOptions } from 'mod-arch-core';
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import { deleteGateway } from '~/app/api/gateways';
import type { Gateway } from '~/app/types/gateway';

type GatewayDeleteModalProps = {
  gateway: Gateway;
  onClose: () => void;
  onDeleted: () => void;
};

const GatewayDeleteModal: React.FC<GatewayDeleteModalProps> = ({
  gateway,
  onClose,
  onDeleted,
}) => {
  const { mutate, isPending } = useMutation({
    mutationKey: ['agent-ops', 'deleteGateway', gateway.name],
    mutationFn: async () => {
      const apiOpts: APIOptions = {};
      return deleteGateway('')(apiOpts, gateway.name);
    },
    onSuccess: () => {
      onDeleted();
    },
    retry: false,
  });

  return (
    <DeleteModal
      title="Delete gateway?"
      onClose={onClose}
      onDelete={() => mutate()}
      deleteName={gateway.name}
      deleting={isPending}
      removeConfirmation
      testId="gateway-delete-modal"
    >
      Are you sure you want to delete gateway <strong>{gateway.name}</strong>? All associated
      providers and sandbox bindings will be removed. This action cannot be undone.
    </DeleteModal>
  );
};

export default GatewayDeleteModal;
