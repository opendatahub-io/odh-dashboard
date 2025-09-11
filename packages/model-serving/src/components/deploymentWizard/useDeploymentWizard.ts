import React from 'react';
import { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { useParams } from 'react-router-dom';
import { K8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { extractK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { LabeledConnection } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { useModelFormatField } from './fields/ModelFormatField';
import { ModelLocationData } from './fields/modelLocationFields/types';
import { useModelTypeField, type ModelTypeFieldData } from './fields/ModelTypeSelectField';
import { useModelLocationData } from './fields/ModelLocationInputFields';
import { useExternalRouteField, type ExternalRouteFieldData } from './fields/ExternalRouteField';
import {
  useTokenAuthenticationField,
  type TokenAuthenticationFieldData,
} from './fields/TokenAuthenticationField';

export type ModelDeploymentWizardData = {
  modelTypeField?: ModelTypeFieldData;
  k8sNameDesc?: K8sNameDescriptionFieldData;
  modelAccessField?: boolean;
  tokenAuthenticationField?: TokenAuthenticationFieldData;
  hardwareProfile?: Parameters<typeof useHardwareProfileConfig>;
  modelFormat?: SupportedModelFormats;
  modelLocationData?: ModelLocationData;
  connections?: LabeledConnection[];
  initSelectedConnection?: LabeledConnection | undefined;
  // Add more field handlers as needed
};

export type ModelDeploymentWizardDataHandlers = {
  setExternalRoute: (data: ExternalRouteFieldData) => void;
  setTokenAuthentication: (data: TokenAuthenticationFieldData) => void;
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
  };
  data: {
    externalRouteField: ExternalRouteFieldData | undefined;
    tokenAuthenticationField: TokenAuthenticationFieldData | undefined;
  };
  handlers: ModelDeploymentWizardDataHandlers;
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
  const modelFormatState = useModelFormatField(initialData?.modelFormat, modelType.data);

  // Step 3: Advanced Options - Individual Fields
  const externalRouteField = useExternalRouteField(
    initialData?.modelAccessField ? { externalRoute: initialData.modelAccessField } : undefined,
  );
  const { data: externalRouteData, setData: setExternalRoute } = externalRouteField;

  const tokenAuthenticationField = useTokenAuthenticationField(
    initialData?.tokenAuthenticationField,
  );
  const { data: tokenAuthenticationData, setData: setTokenAuthentication } =
    tokenAuthenticationField;

  // Step 4: Summary

  return {
    initialData,
    state: {
      modelType,
      k8sNameDesc,
      hardwareProfileConfig,
      modelFormatState,
      modelLocationData,
      externalRoute: externalRouteField,
      tokenAuthentication: tokenAuthenticationField,
    },
    data: {
      externalRouteField: externalRouteData,
      tokenAuthenticationField: tokenAuthenticationData,
    },
    handlers: {
      setExternalRoute,
      setTokenAuthentication,
    },
  };
};
