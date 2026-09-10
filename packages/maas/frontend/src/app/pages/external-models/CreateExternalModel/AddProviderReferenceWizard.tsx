import React from 'react';
import { Modal, ModalVariant, Wizard, WizardHeader, WizardStep } from '@patternfly/react-core';
import { ExternalProvider, ProviderRef } from '~/app/types/external-models';
import AddProviderReferenceForm from './AddProviderReferenceForm';
import AddProviderReferenceWizardFooter from './AddProviderReferenceWizardFooter';
import { configPairsToRecord } from './ModelConfigPairsEditor';
import {
  getProviderReferenceFieldErrors,
  isProviderReferenceFormIncomplete,
  ProviderReferenceFormData,
} from './providerReferenceFormTypes';
import SelectProviderStep, { ProviderSourceType } from './SelectProviderStep';

type AddProviderReferenceWizardProps = {
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

const AddProviderReferenceWizard: React.FC<AddProviderReferenceWizardProps> = ({
  isOpen,
  namespace,
  externalProviders,
  onClose,
  onAdd,
}) => {
  const [providerSource, setProviderSource] = React.useState<ProviderSourceType>('existing');
  const [providerName, setProviderName] = React.useState('');
  const [configureForm, setConfigureForm] =
    React.useState<ProviderReferenceFormData>(emptyConfigureForm);
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

  const isConfigureIncomplete = isProviderReferenceFormIncomplete(configureForm);
  const configureFieldErrors = getProviderReferenceFieldErrors(configureForm);

  const handleConfigureChange = (updates: Partial<ProviderReferenceFormData>) => {
    setConfigureForm((prev) => ({ ...prev, ...updates }));
  };

  const handleAdd = React.useCallback(() => {
    setConfigureTouched(true);
    if (
      !isStepOneValid ||
      isProviderReferenceFormIncomplete(configureForm) ||
      Object.keys(getProviderReferenceFieldErrors(configureForm)).length > 0
    ) {
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
  }, [configureForm, isStepOneValid, onAdd, onClose, providerName]);

  const wizardFooter = React.useMemo(
    () => (
      <AddProviderReferenceWizardFooter
        isNextDisabled={!isStepOneValid}
        isAddDisabled={isConfigureIncomplete}
        submitLabel="Add"
        onAdd={handleAdd}
      />
    ),
    [handleAdd, isConfigureIncomplete, isStepOneValid],
  );

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onEscapePress={onClose}
      aria-labelledby="add-provider-reference-wizard-title"
      aria-describedby="add-provider-reference-wizard-description"
      data-testid="add-provider-reference-wizard"
    >
      <Wizard
        onClose={onClose}
        header={
          <WizardHeader
            title="Add provider reference"
            titleId="add-provider-reference-wizard-title"
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
        <WizardStep name="Configure model" id="configure-model-step" isDisabled={!isStepOneValid}>
          <AddProviderReferenceForm
            form={configureForm}
            selectedProvider={selectedProvider}
            onChange={handleConfigureChange}
            fieldErrors={configureTouched ? configureFieldErrors : undefined}
          />
        </WizardStep>
      </Wizard>
    </Modal>
  );
};

export default AddProviderReferenceWizard;
