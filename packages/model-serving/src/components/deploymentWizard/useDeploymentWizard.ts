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
import {
  useAdvancedSettingsField,
  type AdvancedSettingsFieldData,
} from './fields/AdvancedSettingsSelectField';

export type ModelDeploymentWizardData = {
  modelTypeField?: ModelTypeFieldData;
  k8sNameDesc?: K8sNameDescriptionFieldData;
  advancedSettingsField?: AdvancedSettingsFieldData;
  hardwareProfile?: Parameters<typeof useHardwareProfileConfig>;
  modelFormat?: SupportedModelFormats;
  modelLocationData?: ModelLocationData;
  connections?: LabeledConnection[];
  initSelectedConnection?: LabeledConnection | undefined;
  // Add more field handlers as needed
};

export type ModelDeploymentWizardDataHandlers = {
  setAdvancedSettings: (data: AdvancedSettingsFieldData) => void;
  updateAdvancedSettingsField: (
    key: keyof AdvancedSettingsFieldData,
    value: AdvancedSettingsFieldData[keyof AdvancedSettingsFieldData],
  ) => void;
  updateModelAccess: (externalRoute: boolean) => void;
  updateTokenAuthentication: (tokenAuth: boolean) => void;
};

export type UseModelDeploymentWizardState = {
  initialData?: ModelDeploymentWizardData;
  state: {
    modelType: ReturnType<typeof useModelTypeField>;
    k8sNameDesc: ReturnType<typeof useK8sNameDescriptionFieldData>;
    hardwareProfileConfig: ReturnType<typeof useHardwareProfileConfig>;
    modelFormatState: ReturnType<typeof useModelFormatField>;
    modelLocationData: ReturnType<typeof useModelLocationData>;
    advancedSettings: ReturnType<typeof useAdvancedSettingsField>;
  };
  data: {
    advancedSettingsField: AdvancedSettingsFieldData | undefined;
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

  // Step 3: Advanced Options
  const advancedSettingsField = useAdvancedSettingsField(initialData?.advancedSettingsField);
  const {
    data: advancedSettings,
    setData: setAdvancedSettings,
    updateField: updateAdvancedSettingsField,
  } = advancedSettingsField;

  // Specialized handlers for better semantic API
  const updateModelAccess = React.useCallback(
    (externalRoute: boolean) => {
      updateAdvancedSettingsField('externalRoute', externalRoute);
    },
    [updateAdvancedSettingsField],
  );

  const updateTokenAuthentication = React.useCallback(
    (tokenAuth: boolean) => {
      updateAdvancedSettingsField('tokenAuth', tokenAuth);
    },
    [updateAdvancedSettingsField],
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
      advancedSettings: advancedSettingsField,
    },
    data: {
      advancedSettingsField: advancedSettings,
    },
    handlers: {
      setAdvancedSettings,
      updateAdvancedSettingsField,
      updateModelAccess,
      updateTokenAuthentication,
    },
  };
};
