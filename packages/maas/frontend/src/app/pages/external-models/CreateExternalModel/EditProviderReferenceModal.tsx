import React from 'react';
import {
  Button,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import { ExternalProvider, ProviderRef } from '~/app/types/external-models';
import { configPairsToRecord } from './ModelConfigPairsEditor';
import {
  ProviderReferenceApiFormatField,
  ProviderReferenceConfigSection,
  ProviderReferencePathField,
  ProviderReferenceTargetModelField,
} from './ProviderReferenceStep2Fields';
import {
  getProviderReferenceFieldErrors,
  hasProviderReferenceFieldErrors,
  isProviderReferenceFormIncomplete,
  ProviderReferenceFormData,
} from './providerReferenceFormTypes';
import {
  getProviderDisplayName,
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

  const providerDisplayName = getProviderDisplayName(providerRef.providerName, selectedProvider);
  const isFormIncomplete = isProviderReferenceFormIncomplete(form);
  const fieldErrors = getProviderReferenceFieldErrors(form);
  const visibleFieldErrors = touched ? fieldErrors : undefined;

  const handleChange = (updates: Partial<ProviderReferenceFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    setTouched(true);
    if (isProviderReferenceFormIncomplete(form) || hasProviderReferenceFieldErrors(form)) {
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
      data-testid="edit-provider-reference-modal"
    >
      <ModalHeader title="Edit provider reference" labelId="edit-provider-reference-modal-title" />
      <ModalBody>
        <Form>
          <FormSection title="External provider" titleElement="h3">
            <FormGroup label="External provider" fieldId="edit-provider-ref-external-provider">
              <TextInput
                id="edit-provider-ref-external-provider"
                data-testid="edit-provider-ref-external-provider"
                value={providerDisplayName}
                isDisabled
              />
            </FormGroup>
          </FormSection>

          <FormSection title="Provider reference configuration" titleElement="h3">
            <ProviderReferenceApiFormatField form={form} onChange={handleChange} />
            <ProviderReferenceTargetModelField
              form={form}
              onChange={handleChange}
              fieldErrors={visibleFieldErrors}
            />
          </FormSection>

          <FormSection title="Key-value pairs" titleElement="h3">
            <ProviderReferenceConfigSection
              form={form}
              onChange={handleChange}
              selectedProvider={selectedProvider}
              variant="edit"
            />
          </FormSection>

          <FormSection title="Path configuration" titleElement="h3">
            <ProviderReferencePathField
              form={form}
              onChange={handleChange}
              fieldErrors={visibleFieldErrors}
              pathHelperVariant="edit"
            />
          </FormSection>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSave}
          isDisabled={isFormIncomplete}
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
