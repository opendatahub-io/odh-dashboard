import * as React from 'react';
import { HardwareProfileFeatureVisibility, InferenceServiceKind } from '#~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import {
  useHardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from './useHardwareProfileConfig';

const useServingHardwareProfileConfig = (
  inferenceService?: InferenceServiceKind | null,
): UseHardwareProfileConfigResult => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const legacyName =
    inferenceService?.metadata.annotations?.['opendatahub.io/legacy-hardware-profile-name'];
  const name =
    legacyName || inferenceService?.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
  const resources = inferenceService?.spec.predictor.model?.resources;
  const tolerations = inferenceService?.spec.predictor.tolerations;
  const nodeSelector = inferenceService?.spec.predictor.nodeSelector;
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const hardwareProfileNamespace =
    inferenceService?.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'];

  // Use inferenceService namespace if available (editing), otherwise use current project (creating new)
  const namespace =
    inferenceService?.metadata.namespace ||
    (isProjectScoped ? currentProject.metadata.name : undefined);

  return useHardwareProfileConfig(
    name,
    resources,
    tolerations,
    nodeSelector,
    [HardwareProfileFeatureVisibility.MODEL_SERVING],
    namespace,
    hardwareProfileNamespace,
  );
};

export default useServingHardwareProfileConfig;
