import * as React from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { ExternalProvider } from '~/app/types/external-models';
import CreateExternalProviderForm from '~/app/pages/external-providers/createProvider/CreateExternalProviderForm';
import { useEditExternalProviderForm } from '~/app/pages/external-providers/createProvider/useEditExternalProviderForm';

type EditExternalProviderModalProps = {
  externalProvider: ExternalProvider;
  onClose: (updated?: boolean) => void;
};

const EditExternalProviderModal: React.FC<EditExternalProviderModalProps> = ({
  externalProvider,
  onClose,
}) => {
  const form = useEditExternalProviderForm(externalProvider);

  const handleSubmit = async () => {
    const updatedName = await form.submit();
    if (updatedName) {
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
      <ModalHeader title="Edit external provider" />
      <ModalBody>
        <CreateExternalProviderForm
          form={form}
          submitErrorTitle="Failed to update external provider"
          submitErrorTestId="edit-external-provider-error"
        />
      </ModalBody>
      <ModalFooter>
        <Button
          key="save"
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!form.isFormValid || form.isSubmitting}
          isLoading={form.isSubmitting}
          data-testid="edit-external-provider-submit"
        >
          Save
        </Button>
        <Button
          key="cancel"
          variant="link"
          onClick={() => onClose()}
          isDisabled={form.isSubmitting}
          data-testid="edit-external-provider-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EditExternalProviderModal;
