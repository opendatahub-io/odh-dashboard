import React from 'react';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { extractK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
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
import { type InitialWizardFormData, type WizardFormData } from './types';
import { useCreateConnectionData } from './fields/CreateConnectionInputFields';
import { useProjectSection } from './fields/ProjectSection';
import { useDeploymentStrategyField } from './fields/DeploymentStrategyField';
import { useModelServingHardwareProfile } from './useModelServingHardwareProfile.ts';
import { Deployment } from '../../../extension-points';

export type UseModelDeploymentWizardState = WizardFormData & {
  loaded: {
    modelSourceLoaded: boolean;
    modelDeploymentLoaded: boolean;
    advancedOptionsLoaded: boolean;
    summaryLoaded: boolean;
  };
  advancedOptions: {
    isExternalRouteVisible: boolean;
    shouldAutoCheckTokens: boolean;
  };
};

export const useModelDeploymentWizard = (
  initialData?: InitialWizardFormData,
  initialProjectName?: string | undefined,
  existingDeployment?: Deployment,
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
    return modelLocationData.connectionTypesLoaded;
  }, [modelLocationData.connectionTypesLoaded]);

  // Step 2: Model Deployment
  const k8sNameDesc = useK8sNameDescriptionFieldData({
    initialData: extractK8sNameDescriptionFieldData(initialData?.k8sNameDesc),
    editableK8sName: !initialData?.k8sNameDesc?.k8sName.state.immutable,
  });

  const hardwareProfileOptions = useModelServingHardwareProfile(
    existingDeployment?.model,
    initialData?.hardwareProfilePaths,
  );

  const modelFormatState = useModelFormatField(
    initialData?.modelFormat,
    modelType.data,
    project.projectName,
    React.useCallback(
      (
        newFormat: SupportedModelFormats | undefined,
        prevFormat: SupportedModelFormats | undefined,
      ) => {
        // Only reset if the format actually changed and we're dealing with predictive models
        if (
          modelType.data === ServingRuntimeModelType.PREDICTIVE &&
          newFormat !== prevFormat &&
          prevFormat !== undefined
        ) {
          modelServer.setData(null);
          modelServer.setIsAutoSelectChecked(undefined);
        }
      },
      [modelType.data],
    ),
  );

  const modelServer = useModelServerSelectField(
    initialData?.modelServer,
    modelFormatState.templatesFilteredForModelType,
    modelFormatState.modelFormat,
    modelType.data,
    hardwareProfileOptions.podSpecOptionsState.hardwareProfile.formData.selectedProfile,
  );

  const numReplicas = useNumReplicasField(initialData?.numReplicas ?? undefined);

  // loaded state
  const modelDeploymentLoaded = React.useMemo(() => {
    return hardwareProfileOptions.loaded;
  }, [hardwareProfileOptions.loaded]);

  // Step 3: Advanced Options - Individual Fields
  const modelAvailability = useModelAvailabilityFields(
    initialData?.modelAvailability,
    modelType.data,
    modelServer.data,
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

  return {
    initialData,
    state: {
      project,
      modelType,
      k8sNameDesc,
      hardwareProfileOptions,
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
    },
    loaded: {
      modelSourceLoaded,
      modelDeploymentLoaded,
      advancedOptionsLoaded: true, // TODO: Update if these get dependencies that we need to wait for
      summaryLoaded: true, // TODO: Update if these get dependencies that we need to wait for
    },
    advancedOptions: {
      isExternalRouteVisible: externalRoute.isVisible,
      shouldAutoCheckTokens: tokenAuthentication.shouldAutoCheck,
    },
  };
};
