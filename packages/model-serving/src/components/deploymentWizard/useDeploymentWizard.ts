import React from 'react';
import { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { useParams } from 'react-router-dom';
import { K8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { extractK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { LabeledConnection } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { useModelFormatField } from './fields/ModelFormatField';
import { ModelLocationData } from './fields/modelLocationFields/types';
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
  AvailableAiAssetsFieldsData,
  useAvailableAiAssetsFields,
} from './fields/AvailableAiAssetsFields';
import {
  ModelServerSelectFieldData,
  useModelServerSelectField,
} from './fields/ModelServerTemplateSelectField';

export type ModelDeploymentWizardData = {
  modelTypeField?: ModelTypeFieldData;
  k8sNameDesc?: K8sNameDescriptionFieldData;
  externalRoute?: ExternalRouteFieldData;
  tokenAuthentication?: TokenAuthenticationFieldData;
  numReplicas?: NumReplicasFieldData;
  runtimeArgs?: RuntimeArgsFieldData;
  environmentVariables?: EnvironmentVariablesFieldData;
  hardwareProfile?: Parameters<typeof useHardwareProfileConfig>;
  modelFormat?: SupportedModelFormats;
  modelLocationData?: ModelLocationData;
  modelServer?: ModelServerSelectFieldData;
  isEditing?: boolean;
  connections?: LabeledConnection[];
  initSelectedConnection?: LabeledConnection | undefined;
  AiAssetData?: AvailableAiAssetsFieldsData;
  // Add more field handlers as needed
};

export type UseModelDeploymentWizardState = {
  initialData?: ModelDeploymentWizardData;
  state: {
    modelType: ReturnType<typeof useModelTypeField>;
    k8sNameDesc: ReturnType<typeof useK8sNameDescriptionFieldData>;
    hardwareProfileConfig: ReturnType<typeof useHardwareProfileConfig>;
    modelFormatState: ReturnType<typeof useModelFormatField>;
    modelLocationData: ReturnType<typeof useModelLocationData>;
    externalRoute: ReturnType<typeof useExternalRouteField>;
    tokenAuthentication: ReturnType<typeof useTokenAuthenticationField>;
    numReplicas: ReturnType<typeof useNumReplicasField>;
    runtimeArgs: ReturnType<typeof useRuntimeArgsField>;
    environmentVariables: ReturnType<typeof useEnvironmentVariablesField>;
    AiAssetData: ReturnType<typeof useAvailableAiAssetsFields>;
    modelServer: ReturnType<typeof useModelServerSelectField>;
  };
};

export const useModelDeploymentWizard = (
  initialData?: ModelDeploymentWizardData,
): UseModelDeploymentWizardState => {
  // Step 1: Model Source
  const modelType = useModelTypeField(initialData?.modelTypeField);
  const { namespace } = useParams();
  const { projects } = React.useContext(ProjectsContext);
  const currentProject = projects.find(byName(namespace));
  const modelLocationData = useModelLocationData(
    currentProject ?? null,
    initialData?.modelLocationData,
  );

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
          modelServer.setData({ name: '', namespace: '', scope: '' });
        }
      },
      [modelType.data],
    ),
  );
  const modelServer = useModelServerSelectField(
    initialData?.modelServer,
    currentProject?.metadata.name,
    modelFormatState.templatesFilteredForModelType,
    modelType.data === ServingRuntimeModelType.GENERATIVE // Don't pass model format for generative models
      ? undefined
      : modelFormatState.modelFormat,
  );

  // Step 3: Advanced Options - Individual Fields
  const externalRoute = useExternalRouteField(initialData?.externalRoute ?? undefined);

  const tokenAuthentication = useTokenAuthenticationField(
    initialData?.tokenAuthentication ?? undefined,
  );
  const AiAssetData = useAvailableAiAssetsFields(
    initialData?.AiAssetData ?? undefined,
    modelType.data,
  );

  const numReplicas = useNumReplicasField(initialData?.numReplicas ?? undefined);

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
      modelLocationData,
      externalRoute,
      tokenAuthentication,
      numReplicas,
      runtimeArgs,
      environmentVariables,
      AiAssetData,
      modelServer,
    },
  };
};
