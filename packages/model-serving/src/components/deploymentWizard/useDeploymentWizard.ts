import React from 'react';
import { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { useParams } from 'react-router-dom';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { extractK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { useModelFormatField } from './fields/ModelFormatField';
import { useModelTypeField, type ModelTypeFieldData } from './fields/ModelTypeSelectField';
import { useModelLocationData } from './fields/ModelLocationInputFields';
import { useExternalRouteField, type ExternalRouteFieldData } from './fields/ExternalRouteField';
import {
  useTokenAuthenticationField,
  type TokenAuthenticationFieldData,
} from './fields/TokenAuthenticationField';
import { useNumReplicasField, type NumReplicasFieldData } from './fields/NumReplicasField';
import { useRuntimeArgsField, type RuntimeArgsFieldData } from './fields/RuntimeArgsField';
import {
  useEnvironmentVariablesField,
  type EnvironmentVariablesFieldData,
} from './fields/EnvironmentVariablesField';
import {
  ModelAvailabilityFieldsData,
  useModelAvailabilityFields,
} from './fields/ModelAvailabilityFields';
import {
  useModelServerSelectField,
  type ModelServerOption,
} from './fields/ModelServerTemplateSelectField';
import {
  isModelServerTemplateField,
  isExternalRouteField,
  isTokenAuthField,
  ModelLocationData,
  type WizardFormData,
  type ExternalRouteField,
  type TokenAuthField,
} from './types';
import {
  useCreateConnectionData,
  type CreateConnectionData,
} from './fields/CreateConnectionInputFields';
import { useExtensionStateModifier } from './dynamicFormUtils';

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
  };
  advancedOptions: {
    isExternalRouteVisible: boolean;
    shouldAutoCheckTokens: boolean;
  };
};

export const useModelDeploymentWizard = (
  initialData?: InitialWizardFormData,
): UseModelDeploymentWizardState => {
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
  
  const externalRoute = useExternalRouteField(
    initialData?.externalRoute ?? undefined,
    externalRouteFields,
    modelType.data,
    modelServer.data || undefined,
  );

  const tokenAuthentication = useTokenAuthenticationField(
    initialData?.tokenAuthentication ?? undefined,
    tokenAuthFields,
    modelType.data,
    modelServer.data || undefined,
  );

  const runtimeArgs = useRuntimeArgsField(initialData?.runtimeArgs ?? undefined);
  const environmentVariables = useEnvironmentVariablesField(
    initialData?.environmentVariables ?? undefined,
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
