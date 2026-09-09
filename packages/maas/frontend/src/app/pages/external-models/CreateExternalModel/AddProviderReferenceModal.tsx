import React from 'react';
import { Modal, ModalVariant, Wizard, WizardHeader, WizardStep } from '@patternfly/react-core';
import { ExternalProvider, ProviderRef } from '~/app/types/external-models';
import AddProviderReferenceConfigureStep from './AddProviderReferenceConfigureStep';
import AddProviderReferenceWizardFooter from './AddProviderReferenceWizardFooter';
import { configPairsToRecord } from './ModelConfigPairsEditor';
import {
  ProviderReferenceFormData,
  validateProviderReferenceForm,
} from './providerReferenceFormTypes';
import SelectProviderStep, { ProviderSourceType } from './SelectProviderStep';

type AddProviderReferenceModalProps = {
  isOpen: boolean;
  namespace: string;
  externalProviders: ExternalProvider[];
  onClose: () => void;
  onAdd: (providerRef: ProviderRef) => void;
};

const emptyConfigureForm = (): ProviderReferenceFormData => ({
  apiFormat: 'openai-chat',
  path: '/v1/chat/completions',
  targetModel: '',
  weight: 1,
  configPairs: [],
});

const AddProviderReferenceModal: React.FC<AddProviderReferenceModalProps> = ({
  isOpen,
  namespace,
  externalProviders,
  onClose,
  onAdd,
}) => {
  const [providerSource, setProviderSource] = React.useState<ProviderSourceType>('existing');
  const [providerName, setProviderName] = React.useState('');
  const [configureForm, setConfigureForm] = React.useState<ProviderReferenceFormData>(emptyConfigureForm);
  const [configureTouched, setConfigureTouched] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setProviderSource('existing');
      setProviderName('');
      setConfigureForm(emptyConfigureForm());
      setConfigureTouched(false);
    }
  }, [isOpen]);

  const isStepOneValid = providerSource === 'existing' && providerName.trim() !== '';

  const selectedProvider = React.useMemo(
    () => externalProviders.find((provider) => provider.name === providerName),
    [externalProviders, providerName],
  );

  const configureValidationError = validateProviderReferenceForm(configureForm);

  const handleConfigureChange = (updates: Partial<ProviderReferenceFormData>) => {
    setConfigureForm((prev) => ({ ...prev, ...updates }));
  };

  const handleAdd = React.useCallback(() => {
    setConfigureTouched(true);
    if (!isStepOneValid || configureValidationError) {
      return;
    }

    onAdd({
      providerName: providerName.trim(),
      apiFormat: configureForm.apiFormat.trim(),
      path: configureForm.path.trim(),
      targetModel: configureForm.targetModel.trim(),
      weight: configureForm.weight,
      config: configPairsToRecord(configureForm.configPairs),
    });
    onClose();
  }, [
    configureForm,
    configureValidationError,
    isStepOneValid,
    onAdd,
    onClose,
    providerName,
  ]);

  const wizardFooter = React.useMemo(
    () => (
      <AddProviderReferenceWizardFooter
        isNextDisabled={!isStepOneValid}
        isAddDisabled={!!configureValidationError}
        submitLabel="Add"
        onAdd={handleAdd}
      />
    ),
    [configureValidationError, handleAdd, isStepOneValid],
  );

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="add-provider-reference-modal-title"
      aria-describedby="add-provider-reference-modal-description"
    >
      <Wizard
        height={1000}
        onClose={onClose}
        header={
          <WizardHeader
            title="Add provider reference"
            titleId="add-provider-reference-modal-title"
            onClose={onClose}
            closeButtonAriaLabel="Close wizard"
          />
        }
        footer={wizardFooter}
      >
        <WizardStep name="Select provider" id="select-provider-step">
          <SelectProviderStep
            namespace={namespace}
            providerSource={providerSource}
            onProviderSourceChange={setProviderSource}
            providerName={providerName}
            onProviderNameChange={setProviderName}
            externalProviders={externalProviders}
          />
        </WizardStep>
        <WizardStep
          name="Configure model"
          id="configure-model-step"
          isDisabled={!isStepOneValid}
        >
          <AddProviderReferenceConfigureStep
            form={configureForm}
            selectedProvider={selectedProvider}
            onChange={handleConfigureChange}
            validationError={configureTouched ? configureValidationError : undefined}
          />
        </WizardStep>
      </Wizard>
    </Modal>
  );
};

export default AddProviderReferenceModal;
