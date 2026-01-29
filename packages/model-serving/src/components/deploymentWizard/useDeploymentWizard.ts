import React from 'react';
import { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { extractK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useModelFormatField } from './fields/ModelFormatField';
import { useModelTypeField } from './fields/ModelTypeSelectField';
import { useModelLocationData } from './fields/ModelLocationInputFields';
import { useExternalRouteField } from './fields/ExternalRouteField';
import { useTokenAuthenticationField } from './fields/TokenAuthenticationField';
import { useNumReplicasField } from './fields/NumReplicasField';
import { useRuntimeArgsField } from './fields/RuntimeArgsField';
import { useEnvironmentVariablesField } from './fields/EnvironmentVariablesField';
import { useModelAvailabilityFields } from './fields/ModelAvailabilityFields';
import { useModelServerSelectField } from './fields/ModelServerTemplateSelectField';
import { type InitialWizardFormData, type WizardField, type WizardFormData } from './types';
import { useCreateConnectionData } from './fields/CreateConnectionInputFields';
import { useProjectSection } from './fields/ProjectSection';
import { useDeploymentStrategyField } from './fields/DeploymentStrategyField';
import { useDeploymentWizardReducer, type WizardFormAction } from './useDeploymentWizardReducer';
import type { ExternalDataMap } from './ExternalDataLoader';

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
  dispatch: React.Dispatch<WizardFormAction>;
  fields: WizardField<unknown>[];
};

export const useModelDeploymentWizard = (
  initialData?: InitialWizardFormData,
  initialProjectName?: string | undefined,
  externalDataMap: ExternalDataMap = {},
): UseModelDeploymentWizardState => {
  // Step 1: Model Source
  const modelType = useModelTypeField(initialData?.modelTypeField);
  const project = useProjectSection(initialProjectName);
  const modelLocationData = useModelLocationData(
    project.projectName,
    initialData?.modelLocationData,
  );
  const createConnectionData = useCreateConnectionData(
    project.projectName,
    initialData?.createConnectionData,
    modelLocationData.data,
  );

  // loaded state
  const modelSourceLoaded = React.useMemo(() => {
    return modelLocationData.connectionTypesLoaded && !modelLocationData.isLoadingSecretData;
  }, [modelLocationData.connectionTypesLoaded, modelLocationData.isLoadingSecretData]);

  // Step 2: Model Deployment
  const k8sNameDesc = useK8sNameDescriptionFieldData({
    initialData: extractK8sNameDescriptionFieldData(initialData?.k8sNameDesc),
    editableK8sName: !initialData?.k8sNameDesc?.k8sName.state.immutable,
  });
  const hardwareProfileConfig = useHardwareProfileConfig(...(initialData?.hardwareProfile ?? []));
  const modelFormatState = useModelFormatField(
    initialData?.modelFormat,
    modelType.data,
    project.projectName,
  );

  const modelServer = useModelServerSelectField(
    initialData?.modelServer,
    modelFormatState.templatesFilteredForModelType,
    modelFormatState.modelFormat,
    modelType.data,
    hardwareProfileConfig.formData.selectedProfile,
  );

  const numReplicas = useNumReplicasField(initialData?.numReplicas ?? undefined);

  // loaded state
  const modelDeploymentLoaded = React.useMemo(() => {
    return hardwareProfileConfig.profilesLoaded;
  }, [hardwareProfileConfig.profilesLoaded]);

  // Step 3: Advanced Options - Individual Fields
  const modelAvailability = useModelAvailabilityFields(
    initialData?.modelAvailability,
    modelType.data,
  );

  const externalRoute = useExternalRouteField(
    initialData?.externalRoute ?? undefined,
    modelType,
    modelServer,
  );

  const tokenAuthentication = useTokenAuthenticationField(
    initialData?.tokenAuthentication ?? undefined,
    modelType,
    modelServer,
  );

  const runtimeArgs = useRuntimeArgsField(initialData?.runtimeArgs ?? undefined);
  const environmentVariables = useEnvironmentVariablesField(
    initialData?.environmentVariables ?? undefined,
  );
  const deploymentStrategy = useDeploymentStrategyField(
    initialData?.deploymentStrategy ?? undefined,
    modelType,
    modelServer,
  );

  // Step 4: Summary

  const baseFormState: WizardFormData['state'] = React.useMemo(
    () => ({
      project,
      modelType,
      k8sNameDesc,
      hardwareProfileConfig,
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
      modelServer,
      deploymentStrategy,
    }),
    [
      project,
      modelType,
      k8sNameDesc,
      hardwareProfileConfig,
      modelFormatState,
      modelLocationData,
      createConnectionData,
      externalRoute,
      tokenAuthentication,
      numReplicas,
      runtimeArgs,
      environmentVariables,
      modelAvailability,
      modelServer,
      deploymentStrategy,
    ],
  );

  // The reducer manages dynamic field state and computes active fields from merged state
  const { state, dispatch, fields, externalDataLoaded } = useDeploymentWizardReducer(
    baseFormState,
    initialData,
    externalDataMap,
  );

  return {
    initialData,
    state,
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
