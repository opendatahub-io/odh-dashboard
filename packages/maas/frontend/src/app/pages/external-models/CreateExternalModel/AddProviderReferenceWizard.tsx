import React from 'react';
import { Modal, ModalVariant, Wizard, WizardHeader, WizardStep } from '@patternfly/react-core';
import { ExternalProvider, ProviderRef } from '~/app/types/external-models';
import { useExternalModelsContext } from '~/app/context/ExternalModelsContext';
import { useCreateExternalProviderForm } from '~/app/pages/external-providers/createProvider/useCreateExternalProviderForm';
import { isAuthMechanism } from '~/app/pages/external-providers/validation';
import { toCreateExternalProviderRequest } from '~/app/pages/external-providers/utils';
import {
  getProviderReferenceFieldErrors,
  getVisibleProviderReferenceFieldErrors,
  hasProviderReferenceFieldErrors,
  isProviderReferenceFormIncomplete,
  ProviderReferenceFieldTouched,
  ProviderReferenceFormData,
} from '~/app/pages/external-models/validations';
import { configPairsToRecord } from '~/app/utilities/configPairs';
import ProviderReferenceStep2Form from './ProviderReferenceStep2Form';
import AddProviderReferenceWizardFooter from './AddProviderReferenceWizardFooter';
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
  const { refreshExternalProviders, refreshSecrets } = useExternalModelsContext();
  const createProviderForm = useCreateExternalProviderForm(namespace);

  const [providerSource, setProviderSource] = React.useState<ProviderSourceType>('existing');
  const [providerName, setProviderName] = React.useState('');
  const [createdProviderOverride, setCreatedProviderOverride] = React.useState<
    ExternalProvider | undefined
  >();
  const [configureForm, setConfigureForm] =
    React.useState<ProviderReferenceFormData>(emptyConfigureForm);
  const [fieldTouched, setFieldTouched] = React.useState<ProviderReferenceFieldTouched>({});

  React.useEffect(() => {
    if (isOpen) {
      setProviderSource('existing');
      setProviderName('');
      setCreatedProviderOverride(undefined);
      setConfigureForm(emptyConfigureForm());
      setFieldTouched({});
      createProviderForm.reset();
    }
    // Only reset when the wizard opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleProviderSourceChange = React.useCallback(
    (source: ProviderSourceType) => {
      setProviderSource(source);
      setCreatedProviderOverride(undefined);
      setProviderName('');

      if (source === 'create-new') {
        createProviderForm.reset();
      }
    },
    [createProviderForm],
  );

  const isStepOneValid =
    providerSource === 'existing' ? providerName.trim() !== '' : createProviderForm.isFormValid;

  const selectedProvider = React.useMemo(() => {
    if (
      providerSource === 'create-new' &&
      createdProviderOverride &&
      createdProviderOverride.name === providerName
    ) {
      return createdProviderOverride;
    }
    return externalProviders.find((provider) => provider.name === providerName);
  }, [createdProviderOverride, externalProviders, providerName, providerSource]);

  const validationContext = React.useMemo(
    () => ({ inheritedConfig: selectedProvider?.config }),
    [selectedProvider?.config],
  );

  const isAddDisabled = isProviderReferenceFormIncomplete(configureForm);
  const configureFieldErrors = getProviderReferenceFieldErrors(configureForm, validationContext);
  const visibleFieldErrors = getVisibleProviderReferenceFieldErrors(
    configureFieldErrors,
    fieldTouched,
  );

  const handleConfigureChange = (updates: Partial<ProviderReferenceFormData>) => {
    setConfigureForm((prev) => ({ ...prev, ...updates }));
  };

  const handleFieldTouch = (field: keyof ProviderReferenceFieldTouched) => {
    setFieldTouched((prev) => ({ ...prev, [field]: true }));
  };

  const buildPendingProvider = React.useCallback((): ExternalProvider | undefined => {
    const { authMechanism } = createProviderForm.formData;
    if (!isAuthMechanism(authMechanism)) {
      return undefined;
    }

    const request = toCreateExternalProviderRequest(
      namespace,
      createProviderForm.nameDescData,
      { ...createProviderForm.formData, authMechanism },
      createProviderForm.configPairs,
    );

    return {
      name: request.name,
      namespace: request.namespace,
      displayName: request.displayName,
      description: request.description,
      endpointUrl: request.endpointUrl,
      authMechanism: request.authMechanism,
      credentialSecretRef: request.credentialSecretRef,
      provider: request.provider,
      config: request.config,
    };
  }, [createProviderForm, namespace]);

  const handleNext = React.useCallback(async (): Promise<boolean> => {
    if (providerSource !== 'create-new') {
      setCreatedProviderOverride(undefined);
      return true;
    }

    const pendingProvider = buildPendingProvider();
    if (!pendingProvider) {
      return false;
    }

    setCreatedProviderOverride(pendingProvider);
    setProviderName(pendingProvider.name);
    return true;
  }, [buildPendingProvider, providerSource]);

  const handleAdd = React.useCallback(async (): Promise<boolean> => {
    setFieldTouched(allConfigureFieldsTouched());
    if (!isStepOneValid || hasProviderReferenceFieldErrors(configureForm, validationContext)) {
      return false;
    }

    let resolvedProviderName = providerName.trim();

    if (providerSource === 'create-new') {
      const createdProviderName = await createProviderForm.submit();
      if (!createdProviderName) {
        return false;
      }
      resolvedProviderName = createdProviderName;
      refreshExternalProviders();
      refreshSecrets();
    }

    onAdd({
      providerName: resolvedProviderName,
      apiFormat: configureForm.apiFormat.trim(),
      path: configureForm.path.trim(),
      targetModel: configureForm.targetModel.trim(),
      weight: configureForm.weight,
      config: configPairsToRecord(configureForm.configPairs),
    });
    onClose();
    return true;
  }, [
    configureForm,
    createProviderForm,
    isStepOneValid,
    onAdd,
    onClose,
    providerName,
    providerSource,
    refreshExternalProviders,
    refreshSecrets,
    validationContext,
  ]);

  const wizardFooter = React.useMemo(
    () => (
      <AddProviderReferenceWizardFooter
        isNextDisabled={!isStepOneValid}
        isAddDisabled={isAddDisabled}
        isAddLoading={createProviderForm.isSubmitting}
        submitLabel="Add"
        onAdd={handleAdd}
        onNext={handleNext}
      />
    ),
    [createProviderForm.isSubmitting, handleAdd, handleNext, isAddDisabled, isStepOneValid],
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
            onProviderSourceChange={handleProviderSourceChange}
            providerName={providerName}
            onProviderNameChange={setProviderName}
            externalProviders={externalProviders}
            createProviderForm={createProviderForm}
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
            createProviderSubmitError={
              providerSource === 'create-new' ? createProviderForm.submitError : undefined
            }
          />
        </WizardStep>
      </Wizard>
    </Modal>
  );
};

export default AddProviderReferenceWizard;
