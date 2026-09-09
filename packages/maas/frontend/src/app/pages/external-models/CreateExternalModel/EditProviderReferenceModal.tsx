import React from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { ExternalProvider, ProviderRef } from '~/app/types/external-models';
import EditProviderReferenceForm from './EditProviderReferenceForm';
import { configPairsToRecord } from './ModelConfigPairsEditor';
import {
  ProviderReferenceFormData,
  validateProviderReferenceForm,
} from './providerReferenceFormTypes';
import {
  isProviderReferenceApiFormat,
  recordToConfigPairs,
} from './providerReferenceUtils';

type EditProviderReferenceModalProps = {
  isOpen: boolean;
  providerRef: ProviderRef;
  externalProviders: ExternalProvider[];
  onClose: () => void;
  onSave: (providerRef: ProviderRef) => void;
};

const providerRefToFormState = (providerRef: ProviderRef): ProviderReferenceFormData => ({
  apiFormat: isProviderReferenceApiFormat(providerRef.apiFormat)
    ? providerRef.apiFormat
    : 'openai-chat',
  path: providerRef.path,
  targetModel: providerRef.targetModel,
  weight: providerRef.weight,
  configPairs: recordToConfigPairs(providerRef.config),
});

const EditProviderReferenceModal: React.FC<EditProviderReferenceModalProps> = ({
  isOpen,
  providerRef,
  externalProviders,
  onClose,
  onSave,
}) => {
  const [form, setForm] = React.useState<ProviderReferenceFormData>(() =>
    providerRefToFormState(providerRef),
  );
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setForm(providerRefToFormState(providerRef));
      setTouched(false);
    }
  }, [isOpen, providerRef]);

  const selectedProvider = React.useMemo(
    () => externalProviders.find((provider) => provider.name === providerRef.providerName),
    [externalProviders, providerRef.providerName],
  );

  const validationError = validateProviderReferenceForm(form);

  const handleSave = () => {
    setTouched(true);
    if (validationError) {
      return;
    }

    onSave({
      providerName: providerRef.providerName,
      apiFormat: form.apiFormat.trim(),
      path: form.path.trim(),
      targetModel: form.targetModel.trim(),
      weight: form.weight,
      config: configPairsToRecord(form.configPairs),
    });
    onClose();
  };

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="edit-provider-reference-modal-title"
    >
      <ModalHeader
        title="Edit provider reference"
        labelId="edit-provider-reference-modal-title"
      />
      <ModalBody>
        <EditProviderReferenceForm
          form={form}
          providerName={providerRef.providerName}
          selectedProvider={selectedProvider}
          onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
          validationError={touched ? validationError : undefined}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSave}
          isDisabled={!!validationError}
          data-testid="edit-provider-reference-submit"
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose} data-testid="edit-provider-reference-cancel">
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EditProviderReferenceModal;
