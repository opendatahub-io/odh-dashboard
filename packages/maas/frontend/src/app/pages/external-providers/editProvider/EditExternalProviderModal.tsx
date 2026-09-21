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
import { ExternalProvider } from '~/app/types/external-models';
import CreateExternalProviderForm from '~/app/pages/external-providers/createProvider/CreateExternalProviderForm';
import { useEditExternalProviderForm } from '~/app/pages/external-providers/createProvider/useEditExternalProviderForm';
import {
  convertStringToExternalModelProviderType,
  MaaSEvents,
  ExternalProviderUpdatedProperties,
} from '~/app/types/event-tracking';
import { countNonEmptyConfigPairs } from '~/app/utilities/configPairs';
import { convertStringToAuthMechanism } from '~/app/pages/external-models/utils';

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
          onClick={() => {
            fireFormTrackingEvent(MaaSEvents.EXTERNAL_PROVIDER_UPDATED, {
              outcome: TrackingOutcome.cancel,
              success: false,
              providerType: convertStringToExternalModelProviderType(externalProvider.provider),
              authMechanism: convertStringToAuthMechanism(externalProvider.authMechanism),
              hasDescription: form.nameDescData.description.trim() !== '',
              countOfConfigPairs: countNonEmptyConfigPairs(form.configPairs),
              hasCreatedSecret: form.formData.isNewSecret,
            } satisfies ExternalProviderUpdatedProperties);
            onClose();
          }}
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
