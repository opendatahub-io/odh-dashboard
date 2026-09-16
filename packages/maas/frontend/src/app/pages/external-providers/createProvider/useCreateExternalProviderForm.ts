import * as React from 'react';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import {
  isK8sNameDescriptionDataValid,
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
} from '@odh-dashboard/k8s-core';
import {
  FieldValidationProps,
  useZodFormValidation,
} from '@odh-dashboard/ui-core/hooks/useZodFormValidation';
import { ZodIssue } from 'zod';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import { AuthMechanism, SecretSummary } from '~/app/types/external-models';
import { useExternalModelsContext } from '~/app/context/ExternalModelsContext';
import { useCreateExternalProvider } from '~/app/hooks/useCreateExternalProvider';
import { useCreateSecret } from '~/app/hooks/useCreateSecret';
import { EMPTY_CONFIG_PAIR } from '~/app/pages/external-providers/const';
import {
  formatOrphanedCredentialSecretSubmitError,
  toCreateExternalProviderRequest,
} from '~/app/pages/external-providers/utils';
import {
  createExternalProviderFormSchema,
  getConfigPairsValidationError,
  isAuthMechanism,
} from '~/app/pages/external-providers/validation';
import { ConfigPair, countNonEmptyConfigPairs } from '~/app/utilities/configPairs';
import {
  convertStringToExternalModelProviderType,
  ExternalProviderAddedProperties,
  MaaSEvents,
} from '~/app/types/event-tracking';
import { convertStringToAuthMechanism } from '~/app/pages/external-models/utils';

export type CreateExternalProviderFormFields = {
  provider: string;
  endpointUrl: string;
  authMechanism: AuthMechanism | '';
  credentialSecretRef: string;
  isNewSecret: boolean;
  secretValue: string;
};

const emptyFormFields = (): CreateExternalProviderFormFields => ({
  provider: '',
  endpointUrl: '',
  authMechanism: '',
  credentialSecretRef: '',
  isNewSecret: false,
  secretValue: '',
});

export type UseCreateExternalProviderFormReturn = {
  namespace: string;
  secrets: SecretSummary[];
  secretsLoaded: boolean;
  nameDescData: K8sNameDescriptionFieldData;
  onNameDescChange: K8sNameDescriptionFieldUpdateFunction;
  formData: CreateExternalProviderFormFields;
  setFormData: React.Dispatch<React.SetStateAction<CreateExternalProviderFormFields>>;
  configPairs: ConfigPair[];
  setConfigPairs: React.Dispatch<React.SetStateAction<ConfigPair[]>>;
  isAdvancedExpanded: boolean;
  setIsAdvancedExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isAuthOpen: boolean;
  setIsAuthOpen: React.Dispatch<React.SetStateAction<boolean>>;
  submitError: string | undefined;
  getFieldValidation: (
    fieldPath?: (string | number)[],
    ignoreTouchedFields?: boolean,
  ) => ZodIssue[];
  getFieldValidationProps: (fieldPath?: (string | number)[]) => FieldValidationProps;
  markFieldTouched: (fieldPath?: (string | number)[]) => void;
  configPairsError: string | undefined;
  isFormValid: boolean;
  isSubmitting: boolean;
  configPairCount: number;
  handleProviderChange: (providerType: string) => void;
  submit: () => Promise<string | undefined>;
  reset: () => void;
};

export const useCreateExternalProviderForm = (
  namespace: string,
): UseCreateExternalProviderFormReturn => {
  const { secrets, secretsLoaded, refreshSecrets } = useExternalModelsContext();
  const { isCreating: isCreatingProvider, createExternalProviderCallback } =
    useCreateExternalProvider();
  const { isCreating: isCreatingSecret, createSecretCallback } = useCreateSecret();

  const { data: nameDescData, onDataChange: onNameDescChange } = useK8sNameDescriptionFieldData({});

  const [formData, setFormData] = React.useState<CreateExternalProviderFormFields>(emptyFormFields);
  const [configPairs, setConfigPairs] = React.useState<ConfigPair[]>([EMPTY_CONFIG_PAIR]);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = React.useState(false);
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | undefined>();

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
  const isSubmitting = isCreatingProvider || isCreatingSecret;
  const configPairCount = countNonEmptyConfigPairs(configPairs);

  const reset = React.useCallback(() => {
    onNameDescChange('name', '');
    onNameDescChange('description', '');
    setFormData(emptyFormFields());
    setConfigPairs([EMPTY_CONFIG_PAIR]);
    setIsAdvancedExpanded(false);
    setIsAuthOpen(false);
    setSubmitError(undefined);
  }, [onNameDescChange]);

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
          namespace,
          name: credentialSecretRef,
          value: formData.secretValue.trim(),
        });
        createdSecretName = credentialSecretRef;
      }

      if (!isAuthMechanism(formData.authMechanism)) {
        return undefined;
      }

      const request = toCreateExternalProviderRequest(
        namespace,
        nameDescData,
        {
          provider: formData.provider,
          endpointUrl: formData.endpointUrl,
          authMechanism: formData.authMechanism,
          credentialSecretRef,
        },
        configPairs,
      );

      await createExternalProviderCallback(request);

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
      fireFormTrackingEvent(MaaSEvents.EXTERNAL_PROVIDER_ADDED, {
        outcome: TrackingOutcome.submit,
        success: true,
        providerType: convertStringToExternalModelProviderType(formData.provider),
        authMechanism: convertStringToAuthMechanism(formData.authMechanism),
        hasCreatedSecret: formData.isNewSecret,
        hasDescription: nameDescData.description.trim() !== '',
        countOfConfigPairs: countNonEmptyConfigPairs(configPairs),
      } satisfies ExternalProviderAddedProperties);

      return request.name;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create external provider';
      setSubmitError(
        createdSecretName
          ? formatOrphanedCredentialSecretSubmitError(message, createdSecretName, 'create')
          : message,
      );
      fireFormTrackingEvent(MaaSEvents.EXTERNAL_PROVIDER_ADDED, {
        outcome: TrackingOutcome.submit,
        success: false,
        providerType: convertStringToExternalModelProviderType(formData.provider),
        authMechanism: convertStringToAuthMechanism(formData.authMechanism),
        hasCreatedSecret: formData.isNewSecret,
        hasDescription: nameDescData.description.trim() !== '',
        countOfConfigPairs: countNonEmptyConfigPairs(configPairs),
      } satisfies ExternalProviderAddedProperties);
      return undefined;
    }
  }, [
    configPairs,
    createExternalProviderCallback,
    createSecretCallback,
    formData,
    isFormValid,
    nameDescData,
    namespace,
    refreshSecrets,
  ]);

  return {
    namespace,
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
