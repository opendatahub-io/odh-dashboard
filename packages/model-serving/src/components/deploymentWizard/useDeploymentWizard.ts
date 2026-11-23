import React from 'react';
import { useHardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import {
  extractK8sNameDescriptionFieldData,
  INFERENCE_SERVICE_NAME_INVALID_CHARS_MESSAGE,
  INFERENCE_SERVICE_NAME_REGEX,
  LimitNameResourceType,
} from '@odh-dashboard/k8s-core';
import { useAccessReview } from '@odh-dashboard/plugin-core';
import { useIsAreaAvailable, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import { accessReviewResource } from './steps/AdvancedOptionsStep';
import { useModelFormatField } from './fields/ModelFormatField';
import { useModelTypeField } from './fields/ModelTypeSelectField';
import { useModelLocationData } from './fields/ModelLocationInputFields';
import { useExternalRouteField } from './fields/ExternalRouteField';
import { useTokenAuthenticationField } from './fields/TokenAuthenticationField';
import { useNumReplicasField } from './fields/NumReplicasField';
import { useRuntimeArgsField } from './fields/RuntimeArgsField';
import { useEnvironmentVariablesField } from './fields/EnvironmentVariablesField';
import { useHuggingFaceApiKeyField } from './fields/HuggingFaceApiKeyField';
import { useModelAvailabilityFields } from './fields/ModelAvailabilityFields';
import { useCreateConnectionData } from './fields/CreateConnectionInputFields';
import { useProjectSection } from './fields/ProjectSection';
import { useDeploymentStrategyField } from './fields/DeploymentStrategyField';
import { useValidatedConfigurationsField } from './fields/validatedConfigurations/useValidatedConfigurationsField';
import { buildRuntimeArgsFromValidatedSelections } from './fields/validatedConfigurations/validatedConfigurationUtils';
import {
  useDeploymentWizardReducer,
  wizardFormReducer,
  WizardFormState,
  type WizardFormAction,
} from './useDeploymentWizardReducer';
import type { ExternalDataMap } from './ExternalDataLoader';
import { useIsDRAHardwareProfileSupported } from './deploying/useIsDRAHardwareProfileSupported';
import type { DeployMethodActivationInput } from '../../../extension-points/deployment-wizard';
import {
  type InitialWizardFormData,
  type WizardField,
  type WizardFormData,
  type WizardStateOverrides,
} from '../../shared/types/form-data';

export type UseModelDeploymentWizardState = WizardFormData & {
  loaded: {
    modelSourceLoaded: boolean;
    modelDeploymentLoaded: boolean;
    advancedOptionsLoaded: boolean;
    summaryLoaded: boolean;
    externalDataLoaded: boolean;
  };
  advancedOptions: {
    isExternalRouteVisible: boolean;
    shouldAutoCheckTokens: boolean;
  };
  computedOverrides: WizardStateOverrides;
  deployMethodActivationInput: DeployMethodActivationInput;
  dispatch: React.Dispatch<WizardFormAction>;
  fields: WizardField<unknown>[];
};

export const useModelDeploymentWizard = (
  initialFormDataFromNav?: InitialWizardFormData,
  initialProjectName?: string | undefined,
  externalDataMap: ExternalDataMap = {},
): UseModelDeploymentWizardState => {
  const vLLMDeploymentOnMaaSEnabled = useIsAreaAvailable(SupportedArea.VLLM_ON_MAAS).status;

  const [initialFormData, setInitialFormData] = React.useState<InitialWizardFormData | undefined>(
    initialFormDataFromNav,
  );

  // Declare reducer state first so field hooks can access it
  // `fieldValues` are user-provided, `initialValues` are calculated by the reducer
  const [formReducerState, formReducerDispatch] = React.useReducer(wizardFormReducer, {
    fieldValues: {},
    initialValues: {},
  });
  const formState: Partial<WizardFormState> = React.useMemo(
    () => ({
      ...formReducerState.initialValues,
      ...formReducerState.fieldValues,
      ...{ devFeatureFlags: { vLLMDeploymentOnMaaS: vLLMDeploymentOnMaaSEnabled } },
    }),
    [formReducerState.initialValues, formReducerState.fieldValues, vLLMDeploymentOnMaaSEnabled],
  );

  // Step 1: Model Source
  const project = useProjectSection(initialProjectName);

  const [canCreateRoleBindings] = useAccessReview({
    ...accessReviewResource,
    namespace: project.projectName ?? undefined,
  });

  const modelLocationData = useModelLocationData(
    project.projectName,
    initialFormData?.modelLocationData,
  );
  const createConnectionData = useCreateConnectionData(
    project.projectName,
    initialFormData?.createConnectionData,
    modelLocationData.data,
  );
  const modelType = useModelTypeField(initialFormData?.modelTypeField, modelLocationData.data);

  // loaded state
  const modelSourceLoaded = React.useMemo(() => {
    return modelLocationData.connectionTypesLoaded && !modelLocationData.isLoadingSecretData;
  }, [modelLocationData.connectionTypesLoaded, modelLocationData.isLoadingSecretData]);

  // Step 2: Model Deployment
  const k8sNameDesc = useK8sNameDescriptionFieldData({
    initialData: extractK8sNameDescriptionFieldData(initialFormData?.k8sNameDesc),
    editableK8sName: !initialFormData?.k8sNameDesc?.k8sName.state.immutable,
    limitNameResourceType: LimitNameResourceType.MODEL_DEPLOYMENT,
    namespace: project.projectName ?? undefined,
    regexp: INFERENCE_SERVICE_NAME_REGEX,
    invalidCharsMessage: INFERENCE_SERVICE_NAME_INVALID_CHARS_MESSAGE,
  });
  const modelFormatState = useModelFormatField(
    initialFormData?.modelFormat,
    modelType.data,
    project.projectName,
  );

  const numReplicas = useNumReplicasField(initialFormData?.numReplicas ?? undefined);

  // Step 3: Advanced Options - Individual Fields
  const modelAvailability = useModelAvailabilityFields(
    initialFormData?.modelAvailability,
    modelType.data,
  );

  const externalRoute = useExternalRouteField(
    initialFormData?.externalRoute ?? undefined,
    modelType,
    formState.modelServer,
    formState.deploymentMethod,
  );

  const tokenAuthentication = useTokenAuthenticationField(
    initialFormData?.tokenAuthentication ?? undefined,
    modelType,
    formState.modelServer,
    formState.deploymentMethod,
    canCreateRoleBindings,
  );

  const runtimeArgs = useRuntimeArgsField(
    initialFormData?.runtimeArgs ??
      buildRuntimeArgsFromValidatedSelections(
        initialFormData?.validatedConfigurations,
        initialFormData?.selectedValidatedConfigurations,
      ),
  );
  const environmentVariables = useEnvironmentVariablesField(
    initialFormData?.environmentVariables ?? undefined,
  );
  const deploymentStrategy = useDeploymentStrategyField(
    initialFormData?.deploymentStrategy ?? undefined,
    modelType,
    formState.modelServer,
    formState.deploymentMethod,
  );
  const validatedConfigurationSelection = useValidatedConfigurationsField(
    initialFormData?.selectedValidatedConfigurations,
  );
  const huggingFaceApiKey = useHuggingFaceApiKeyField(initialFormData?.huggingFaceApiKey);
  const requiresHuggingFaceApiKey = React.useMemo(
    () =>
      Boolean(
        initialFormData?.requiresHuggingFaceApiKey ||
          initialFormData?.huggingFaceApiKey?.configuredSecretName,
      ),
    [
      initialFormData?.requiresHuggingFaceApiKey,
      initialFormData?.huggingFaceApiKey?.configuredSecretName,
    ],
  );

  // Step 4: Summary

  const stateWithoutHardwareProfile = React.useMemo(
    () => ({
      project,
      modelType,
      k8sNameDesc,
      modelFormatState,
      modelLocationData: {
        ...modelLocationData,
        selectedConnection: modelLocationData.selectedConnection,
      },
      createConnectionData,
      externalRoute,
      tokenAuthentication,
      numReplicas,
      runtimeArgs,
      environmentVariables,
      modelAvailability,
      deploymentStrategy,
      canCreateRoleBindings,
      validatedConfigurationSelection,
      huggingFaceApiKey,
      requiresHuggingFaceApiKey,
      ...formState,
    }),
    [
      project,
      modelType,
      k8sNameDesc,
      modelFormatState,
      modelLocationData,
      createConnectionData,
      externalRoute,
      tokenAuthentication,
      numReplicas,
      runtimeArgs,
      environmentVariables,
      modelAvailability,
      deploymentStrategy,
      canCreateRoleBindings,
      validatedConfigurationSelection,
      huggingFaceApiKey,
      requiresHuggingFaceApiKey,
      formState,
    ],
  );

  const deployMethodActivationInput: DeployMethodActivationInput = React.useMemo(
    () => ({
      deploymentMethod: formState.deploymentMethod,
      modelLocationData: { data: modelLocationData.data },
    }),
    [formState.deploymentMethod, modelLocationData.data],
  );
  const isDRAHardwareProfileSupported = useIsDRAHardwareProfileSupported(
    deployMethodActivationInput,
  );
  const [
    hardwareProfileName,
    hardwareProfileResources,
    hardwareProfileTolerations,
    hardwareProfileNodeSelector,
    hardwareProfileVisibleIn,
    hardwareProfileResourceNamespace,
    hardwareProfileNamespace,
  ] = initialFormData?.hardwareProfile ?? [];
  const hardwareProfileConfig = useHardwareProfileConfig(
    hardwareProfileName,
    hardwareProfileResources,
    hardwareProfileTolerations,
    hardwareProfileNodeSelector,
    hardwareProfileVisibleIn,
    hardwareProfileResourceNamespace,
    hardwareProfileNamespace,
    {
      allowDRAProfiles: isDRAHardwareProfileSupported ?? 'pending',
      project: project.projectName,
    },
  );

  // loaded state
  const modelDeploymentLoaded = React.useMemo(() => {
    return hardwareProfileConfig.profilesLoaded && isDRAHardwareProfileSupported !== undefined;
  }, [hardwareProfileConfig.profilesLoaded, isDRAHardwareProfileSupported]);

  const mergedFormState: WizardFormData['state'] = React.useMemo(
    () => ({ ...stateWithoutHardwareProfile, hardwareProfileConfig, ...formState }),
    [stateWithoutHardwareProfile, hardwareProfileConfig, formState],
  );

  // The reducer manages dynamic field state and computes active fields from merged state
  const { state, dispatch, fields, externalDataLoaded, computedOverrides } =
    useDeploymentWizardReducer(
      mergedFormState,
      formReducerDispatch,
      setInitialFormData,
      externalDataMap,
      initialFormData,
    );

  const tokenAuthOverrides = React.useMemo(
    () => computedOverrides.tokenAuthentication ?? {},
    [computedOverrides.tokenAuthentication],
  );
  const tokenAuthDisabled = tokenAuthOverrides.isDisabled ?? false;
  const modelAvailabilityOverrides = React.useMemo(
    () => computedOverrides.modelAvailability ?? {},
    [computedOverrides.modelAvailability],
  );
  const stateWithOverrides: WizardFormData['state'] = React.useMemo(
    () => ({
      ...state,
      modelAvailability: {
        ...state.modelAvailability,
        isDisabled: modelAvailabilityOverrides.isDisabled,
        isMaaSSubscriptionSelected: modelAvailabilityOverrides.isMaaSSubscriptionSelected,
        data: modelAvailabilityOverrides.forceSaveAsAiAsset
          ? { ...state.modelAvailability.data, saveAsAiAsset: true }
          : state.modelAvailability.data,
      },
      tokenAuthentication: {
        ...state.tokenAuthentication,
        ...tokenAuthOverrides,
        isDisabled: tokenAuthDisabled,
        ...(tokenAuthDisabled ? { data: [] } : {}),
      },
      'llmd-serving/gateway': {
        ...(state['llmd-serving/gateway'] ?? {}),
        ...computedOverrides['llmd-serving/gateway'],
      },
    }),
    [state, tokenAuthDisabled, tokenAuthOverrides, modelAvailabilityOverrides, computedOverrides],
  );

  return {
    initialData: initialFormData,
    state: stateWithOverrides,
    computedOverrides,
    deployMethodActivationInput,
    dispatch,
    fields,
    loaded: {
      modelSourceLoaded,
      modelDeploymentLoaded,
      advancedOptionsLoaded: externalDataLoaded,
      summaryLoaded: true, // TODO: Update if these get dependencies that we need to wait for
      externalDataLoaded,
    },
    advancedOptions: {
      isExternalRouteVisible: externalRoute.isVisible,
      shouldAutoCheckTokens: tokenAuthentication.shouldAutoCheck,
    },
  };
};
