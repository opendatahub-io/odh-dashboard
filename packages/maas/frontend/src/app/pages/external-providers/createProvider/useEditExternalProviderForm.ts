import * as React from 'react';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/k8s-core';
import { useZodFormValidation } from '@odh-dashboard/ui-core/hooks/useZodFormValidation';
import { TrackingOutcome } from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ExternalProvider } from '~/app/types/external-models';
import { useExternalModelsContext } from '~/app/context/ExternalModelsContext';
import { useCreateSecret } from '~/app/hooks/useCreateSecret';
import { useUpdateExternalProvider } from '~/app/hooks/useUpdateExternalProvider';
import {
  externalProviderToFormState,
  formatOrphanedCredentialSecretSubmitError,
  toUpdateExternalProviderRequest,
} from '~/app/pages/external-providers/utils';
import {
  createExternalProviderFormSchema,
  getConfigPairsValidationError,
  isAuthMechanism,
} from '~/app/pages/external-providers/validation';
import { ConfigPair, countNonEmptyConfigPairs } from '~/app/utilities/configPairs';
import {
  convertStringToExternalModelProviderType,
  ExternalProviderUpdatedProperties,
  MaaSEvents,
} from '~/app/types/event-tracking';
import { convertStringToAuthMechanism } from '~/app/pages/external-models/utils';
import {
  CreateExternalProviderFormFields,
  UseCreateExternalProviderFormReturn,
} from './useCreateExternalProviderForm';

export const useEditExternalProviderForm = (
  externalProvider: ExternalProvider,
): UseCreateExternalProviderFormReturn => {
  const { secrets, secretsLoaded, refreshSecrets } = useExternalModelsContext();
  const { isUpdating, updateExternalProviderCallback } = useUpdateExternalProvider();
  const { isCreating: isCreatingSecret, createSecretCallback } = useCreateSecret();

  const initialState = React.useMemo(
    () => externalProviderToFormState(externalProvider),
    [externalProvider],
  );

  const { data: nameDescData, onDataChange: onNameDescChange } = useK8sNameDescriptionFieldData({
    initialData: initialState.nameDescInitialData,
  });

  const [formData, setFormData] = React.useState<CreateExternalProviderFormFields>(
    initialState.formData,
  );
  const [configPairs, setConfigPairs] = React.useState<ConfigPair[]>(initialState.configPairs);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = React.useState(
    countNonEmptyConfigPairs(initialState.configPairs) > 0,
  );
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | undefined>();

  React.useEffect(() => {
    const nextState = externalProviderToFormState(externalProvider);
    onNameDescChange('name', nextState.nameDescInitialData.name);
    onNameDescChange('description', nextState.nameDescInitialData.description);
    onNameDescChange('k8sName', nextState.nameDescInitialData.k8sName);
    setFormData(nextState.formData);
    setConfigPairs(nextState.configPairs);
    setIsAdvancedExpanded(countNonEmptyConfigPairs(nextState.configPairs) > 0);
    setIsAuthOpen(false);
    setSubmitError(undefined);
  }, [externalProvider, onNameDescChange]);

  const { getFieldValidation, getFieldValidationProps, markFieldTouched } = useZodFormValidation(
    formData,
    createExternalProviderFormSchema,
  );

  const isValidK8sNameDescription = isK8sNameDescriptionDataValid(nameDescData);
  const configPairsError = getConfigPairsValidationError(configPairs);
  const isFormValid =
    isValidK8sNameDescription &&
    !configPairsError &&
    getFieldValidation(undefined, true).length === 0;
  const isSubmitting = isUpdating || isCreatingSecret;
  const configPairCount = countNonEmptyConfigPairs(configPairs);

  const reset = React.useCallback(() => {
    const nextState = externalProviderToFormState(externalProvider);
    onNameDescChange('name', nextState.nameDescInitialData.name);
    onNameDescChange('description', nextState.nameDescInitialData.description);
    onNameDescChange('k8sName', nextState.nameDescInitialData.k8sName);
    setFormData(nextState.formData);
    setConfigPairs(nextState.configPairs);
    setIsAdvancedExpanded(countNonEmptyConfigPairs(nextState.configPairs) > 0);
    setIsAuthOpen(false);
    setSubmitError(undefined);
  }, [externalProvider, onNameDescChange]);

  const handleProviderChange = React.useCallback((providerType: string) => {
    setFormData((current) => ({ ...current, provider: providerType }));
  }, []);

  const submit = React.useCallback(async (): Promise<string | undefined> => {
    if (!isFormValid) {
      return undefined;
    }

    setSubmitError(undefined);

    const credentialSecretRef = formData.credentialSecretRef.trim();
    let createdSecretName: string | undefined;

    try {
      if (formData.isNewSecret) {
        await createSecretCallback({
          namespace: externalProvider.namespace,
          name: credentialSecretRef,
          value: formData.secretValue.trim(),
        });
        createdSecretName = credentialSecretRef;
      }

      if (!isAuthMechanism(formData.authMechanism)) {
        return undefined;
      }

      const request = toUpdateExternalProviderRequest(
        nameDescData,
        {
          provider: formData.provider,
          endpointUrl: formData.endpointUrl,
          authMechanism: formData.authMechanism,
          credentialSecretRef,
        },
        configPairs,
      );

      await updateExternalProviderCallback(
        externalProvider.namespace,
        externalProvider.name,
        request,
      );

      if (createdSecretName) {
        const linkedSecretName = createdSecretName;
        refreshSecrets();
        setFormData((current) => ({
          ...current,
          isNewSecret: false,
          credentialSecretRef: linkedSecretName,
          secretValue: '',
        }));
      }
      fireFormTrackingEvent(MaaSEvents.EXTERNAL_PROVIDER_UPDATED, {
        outcome: TrackingOutcome.submit,
        success: true,
        providerType: convertStringToExternalModelProviderType(formData.provider),
        authMechanism: convertStringToAuthMechanism(formData.authMechanism),
        hasDescription: nameDescData.description.trim() !== '',
        countOfConfigPairs: countNonEmptyConfigPairs(configPairs),
        hasCreatedSecret: formData.isNewSecret,
      } satisfies ExternalProviderUpdatedProperties);

      return externalProvider.name;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update external provider';
      setSubmitError(
        createdSecretName
          ? formatOrphanedCredentialSecretSubmitError(message, createdSecretName, 'update')
          : message,
      );
      fireFormTrackingEvent(MaaSEvents.EXTERNAL_PROVIDER_UPDATED, {
        outcome: TrackingOutcome.submit,
        success: false,
        providerType: convertStringToExternalModelProviderType(formData.provider),
        authMechanism: convertStringToAuthMechanism(formData.authMechanism),
        hasDescription: nameDescData.description.trim() !== '',
        countOfConfigPairs: countNonEmptyConfigPairs(configPairs),
        hasCreatedSecret: formData.isNewSecret,
      } satisfies ExternalProviderUpdatedProperties);
      return undefined;
    }
  }, [
    configPairs,
    createSecretCallback,
    externalProvider.name,
    externalProvider.namespace,
    formData,
    isFormValid,
    nameDescData,
    refreshSecrets,
    updateExternalProviderCallback,
  ]);

  return {
    namespace: externalProvider.namespace,
    secrets,
    secretsLoaded,
    nameDescData,
    onNameDescChange,
    formData,
    setFormData,
    configPairs,
    setConfigPairs,
    isAdvancedExpanded,
    setIsAdvancedExpanded,
    isAuthOpen,
    setIsAuthOpen,
    submitError,
    getFieldValidation,
    getFieldValidationProps,
    markFieldTouched,
    configPairsError,
    isFormValid,
    isSubmitting,
    configPairCount,
    handleProviderChange,
    submit,
    reset,
  };
};
