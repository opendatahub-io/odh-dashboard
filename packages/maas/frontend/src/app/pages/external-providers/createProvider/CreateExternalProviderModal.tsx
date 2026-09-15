import * as React from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import CreateExternalProviderForm from './CreateExternalProviderForm';
import { useCreateExternalProviderForm } from './useCreateExternalProviderForm';

type CreateExternalProviderModalProps = {
  namespace: string;
  onClose: (created?: boolean) => void;
};

const CreateExternalProviderModal: React.FC<CreateExternalProviderModalProps> = ({
  namespace,
  onClose,
}) => {
  const form = useCreateExternalProviderForm(namespace);

  const handleSubmit = async () => {
    const createdName = await form.submit();
    if (createdName) {
      onClose(true);
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={() => {
        if (!form.isSubmitting) {
          onClose();
        }
      }}
    >
      <ModalHeader title="Add external provider" />
      <ModalBody>
        <CreateExternalProviderForm form={form} />
      </ModalBody>
      <ModalFooter>
        <Button
          key="create"
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!form.isFormValid || form.isSubmitting}
          isLoading={form.isSubmitting}
          data-testid="create-external-provider-submit"
        >
          Add
        </Button>
        <Button
          key="cancel"
          variant="link"
          onClick={() => onClose()}
          isDisabled={form.isSubmitting}
          data-testid="create-external-provider-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateExternalProviderModal;
