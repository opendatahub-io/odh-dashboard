import { useModelServingPodSpecOptionsState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import type { ModelServingPodSpecOptionsState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { extractHardwareProfileConfigFromInferenceService } from '@odh-dashboard/internal/concepts/hardwareProfiles/useServingHardwareProfileConfig';
import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { KServeDeployment } from './deployments';

export const useKServeResources = (
  kserveDeployment: KServeDeployment,
): ModelServingPodSpecOptionsState => {
  const resources = useModelServingPodSpecOptionsState(
    kserveDeployment.server,
    kserveDeployment.model,
    false,
  );

  return resources;
};

export const extractHardwareProfileConfig = (
  kserveDeployment: KServeDeployment,
): Parameters<typeof useHardwareProfileConfig> => {
  return extractHardwareProfileConfigFromInferenceService(kserveDeployment.model);
};

export const extractReplicas = (kserveDeployment: KServeDeployment): number | null => {
  return (
    kserveDeployment.model.spec.predictor.minReplicas ??
    kserveDeployment.model.spec.predictor.maxReplicas ??
    null
  );
};

export const extractRuntimeArgs = (
  kserveDeployment: KServeDeployment,
): { enabled: boolean; args: string[] } => {
  const args = kserveDeployment.model.spec.predictor.model?.args || [];
  return {
    enabled: args.length > 0,
    args,
  };
};

export const extractEnvironmentVariables = (
  kserveDeployment: KServeDeployment,
): { enabled: boolean; variables: { name: string; value: string }[] } => {
  const envVars = kserveDeployment.model.spec.predictor.model?.env || [];
  return {
    enabled: envVars.length > 0,
    variables: envVars.map((envVar) => ({
      name: envVar.name,
      value: envVar.value || '',
    })),
  };
};

export const applyHardwareProfileToDeployment = (
  kserveDeployment: KServeDeployment,
  // TODO: use parameters to assemble hardware profile config for the deployment action
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parameters: ReturnType<typeof useHardwareProfileConfig>,
): KServeDeployment => {
  return kserveDeployment;
};
