import React from 'react';
import { Modal, ModalVariant, Wizard, WizardHeader, WizardStep } from '@patternfly/react-core';
import { ExternalProvider, ProviderRef } from '~/app/types/external-models';
import {
  getVisibleProviderReferenceFieldErrors,
  getProviderReferenceFieldErrors,
  isProviderReferenceFormIncomplete,
  ProviderReferenceFieldTouched,
  ProviderReferenceFormData,
} from '~/app/pages/external-models/validations';
import ProviderReferenceStep2Form from './ProviderReferenceStep2Form';
import AddProviderReferenceWizardFooter from './AddProviderReferenceWizardFooter';
import { configPairsToRecord } from './ModelConfigPairsEditor';
import SelectProviderStep, { ProviderSource, type ProviderSourceType } from './SelectProviderStep';

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

const allConfigureFieldsTouched = (): ProviderReferenceFieldTouched => ({
  targetModel: true,
  path: true,
});

const AddProviderReferenceWizard: React.FC<AddProviderReferenceWizardProps> = ({
  isOpen,
  namespace,
  externalProviders,
  onClose,
  onAdd,
}) => {
  const [providerSource, setProviderSource] = React.useState<ProviderSourceType>(
    ProviderSource.EXISTING,
  );
  const [providerName, setProviderName] = React.useState('');
  const [configureForm, setConfigureForm] =
    React.useState<ProviderReferenceFormData>(emptyConfigureForm);
  const [fieldTouched, setFieldTouched] = React.useState<ProviderReferenceFieldTouched>({});

  React.useEffect(() => {
    if (isOpen) {
      setProviderSource(ProviderSource.EXISTING);
      setProviderName('');
      setConfigureForm(emptyConfigureForm());
      setFieldTouched({});
    }
  }, [isOpen]);

  const isStepOneValid = providerSource === ProviderSource.EXISTING && providerName.trim() !== '';

  const selectedProvider = React.useMemo(
    () => externalProviders.find((provider) => provider.name === providerName),
    [externalProviders, providerName],
  );

  const validationContext = React.useMemo(
    () => ({ inheritedConfig: selectedProvider?.config }),
    [selectedProvider?.config],
  );

  const isAddDisabled = isProviderReferenceFormIncomplete(configureForm, validationContext);
  const configureFieldErrors = getProviderReferenceFieldErrors(configureForm, validationContext);
  const visibleFieldErrors = getVisibleProviderReferenceFieldErrors(
    configureForm,
    configureFieldErrors,
    fieldTouched,
  );

  const handleConfigureChange = (updates: Partial<ProviderReferenceFormData>) => {
    setConfigureForm((prev) => ({ ...prev, ...updates }));
  };

  const handleFieldTouch = (field: keyof ProviderReferenceFieldTouched) => {
    setFieldTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleAdd = React.useCallback(() => {
    setFieldTouched(allConfigureFieldsTouched());
    if (!isStepOneValid || isProviderReferenceFormIncomplete(configureForm, validationContext)) {
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
  }, [configureForm, isStepOneValid, onAdd, onClose, providerName, validationContext]);

  const wizardFooter = React.useMemo(
    () => (
      <AddProviderReferenceWizardFooter
        isNextDisabled={!isStepOneValid}
        isAddDisabled={isAddDisabled}
        submitLabel="Add"
        onAdd={handleAdd}
      />
    ),
    [handleAdd, isAddDisabled, isStepOneValid],
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
          <ProviderReferenceStep2Form
            form={configureForm}
            selectedProvider={selectedProvider}
            onChange={handleConfigureChange}
            fieldErrors={visibleFieldErrors}
            onTargetModelBlur={() => handleFieldTouch('targetModel')}
            onPathBlur={() => handleFieldTouch('path')}
          />
        </WizardStep>
      </Wizard>
    </Modal>
  );
};

export default AddProviderReferenceWizard;
