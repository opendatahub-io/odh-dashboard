import * as React from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import { convertStringToAuthMechanism } from '~/app/pages/external-models/utils';
import { countNonEmptyConfigPairs } from '~/app/utilities/configPairs';
import {
  ExternalProviderAddedProperties,
  MaaSEvents,
  convertStringToExternalModelProviderType,
} from '~/app/types/event-tracking';
import { useCreateExternalProviderForm } from './useCreateExternalProviderForm';
import CreateExternalProviderForm from './CreateExternalProviderForm';

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
          onClick={() => {
            onClose();
            fireFormTrackingEvent(MaaSEvents.EXTERNAL_PROVIDER_ADDED, {
              outcome: TrackingOutcome.cancel,
              success: false,
              providerType: convertStringToExternalModelProviderType(form.formData.provider),
              authMechanism: convertStringToAuthMechanism(form.formData.authMechanism),
              hasCreatedSecret: form.formData.isNewSecret,
              hasDescription: form.nameDescData.description.trim() !== '',
              countOfConfigPairs: countNonEmptyConfigPairs(form.configPairs),
            } satisfies ExternalProviderAddedProperties);
          }}
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
