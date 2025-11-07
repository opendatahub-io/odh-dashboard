import React from 'react';
import { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { useParams } from 'react-router-dom';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { extractK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
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
import { useDeploymentStrategyField } from './fields/DeploymentStrategyField';
import {
  isExternalRouteField,
  isTokenAuthField,
  isDeploymentStrategyField,
  type DeploymentStrategyField,
  type ExternalRouteField,
  type InitialWizardFormData,
  type TokenAuthField,
  type WizardFormData,
} from './types';
import { useCreateConnectionData } from './fields/CreateConnectionInputFields';
import { useExtensionStateModifier, useWizardFieldsFromExtensions } from './dynamicFormUtils';

export type UseModelDeploymentWizardState = WizardFormData & {
  loaded: {
    modelSourceLoaded: boolean;
    modelDeploymentLoaded: boolean;
    advancedOptionsLoaded: boolean;
    summaryLoaded: boolean;
  };
  fieldExtensions: {
    externalRouteFields: ExternalRouteField[];
    tokenAuthFields: TokenAuthField[];
    deploymentStrategyFields: DeploymentStrategyField[];
  };
  advancedOptions: {
    isExternalRouteVisible: boolean;
    shouldAutoCheckTokens: boolean;
  };
};

export const useModelDeploymentWizard = (
  initialData?: InitialWizardFormData,
): UseModelDeploymentWizardState => {
  const [fields] = useWizardFieldsFromExtensions();

  // Step 1: Model Source
  const modelType = useModelTypeField(initialData?.modelTypeField);
  const { namespace } = useParams();
  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const currentProject = projects.find(byName(namespace));
  const modelLocationData = useModelLocationData(
    currentProject ?? null,
    initialData?.modelLocationData,
  );
  const createConnectionData = useCreateConnectionData(
    currentProject ?? null,
    initialData?.createConnectionData,
    modelLocationData.data,
  );

  // loaded state
  const modelSourceLoaded = React.useMemo(() => {
    return (
      modelLocationData.connectionsLoaded &&
      modelLocationData.connectionTypesLoaded &&
      projectsLoaded
    );
  }, [
    modelLocationData.connectionsLoaded,
    modelLocationData.connectionTypesLoaded,
    projectsLoaded,
  ]);

  // Step 2: Model Deployment
  const k8sNameDesc = useK8sNameDescriptionFieldData({
    initialData: extractK8sNameDescriptionFieldData(initialData?.k8sNameDesc),
  });
  const hardwareProfileConfig = useHardwareProfileConfig(...(initialData?.hardwareProfile ?? []));
  const modelFormatState = useModelFormatField(
    initialData?.modelFormat,
    modelType.data,
    currentProject?.metadata.name,
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
        }
      },
      [modelType.data],
    ),
  );

  const modelServer = useExtensionStateModifier(
    'modelServerTemplate',
    useModelServerSelectField,
    [
      initialData?.modelServer,
      currentProject?.metadata.name,
      modelFormatState.templatesFilteredForModelType,
      modelType.data === ServingRuntimeModelType.GENERATIVE // Don't pass model format for generative models
        ? undefined
        : modelFormatState.modelFormat,
      modelType.data,
    ],
    {
      modelType,
    },
  );

  const numReplicas = useNumReplicasField(initialData?.numReplicas ?? undefined);

  // loaded state
  const modelDeploymentLoaded = React.useMemo(() => {
    return modelFormatState.loaded && hardwareProfileConfig.profilesLoaded;
  }, [modelFormatState.loaded, hardwareProfileConfig.profilesLoaded]);

  // Step 3: Advanced Options - Individual Fields
  const modelAvailability = useExtensionStateModifier(
    'modelAvailability',
    useModelAvailabilityFields,
    [initialData?.modelAvailability, modelType.data],
    {
      modelType,
      modelServer,
    },
  );

  const externalRouteFields = React.useMemo(() => {
    return fields.filter(isExternalRouteField);
  }, [fields]);

  const tokenAuthFields = React.useMemo(() => {
    return fields.filter(isTokenAuthField);
  }, [fields]);

  const deploymentStrategyFields = React.useMemo(() => {
    return fields.filter(isDeploymentStrategyField);
  }, [fields]);

  const fieldExtensions = {
    externalRouteFields,
    tokenAuthFields,
    deploymentStrategyFields,
  };

  const externalRoute = useExternalRouteField(
    initialData?.externalRoute ?? undefined,
    externalRouteFields,
    modelType,
    modelServer,
  );

  const tokenAuthentication = useTokenAuthenticationField(
    initialData?.tokenAuthentication ?? undefined,
    tokenAuthFields,
    modelType,
    modelServer,
  );

  const runtimeArgs = useRuntimeArgsField(initialData?.runtimeArgs ?? undefined);
  const environmentVariables = useEnvironmentVariablesField(
    initialData?.environmentVariables ?? undefined,
  );
  const deploymentStrategy = useDeploymentStrategyField(
    initialData?.deploymentStrategy ?? undefined,
    deploymentStrategyFields,
    modelType,
    modelServer,
  );

  // Step 4: Summary

  return {
    initialData,
    state: {
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
    },
    loaded: {
      modelSourceLoaded,
      modelDeploymentLoaded,
      advancedOptionsLoaded: true, // TODO: Update if these get dependencies that we need to wait for
      summaryLoaded: true, // TODO: Update if these get dependencies that we need to wait for
    },
    fieldExtensions,
    advancedOptions: {
      isExternalRouteVisible: externalRoute.isVisible,
      shouldAutoCheckTokens: tokenAuthentication.shouldAutoCheck,
    },
  };
};
