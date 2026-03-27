import type { KServeDeployment } from './deployments';

/**
 * Validates a KServe deployment for configurations that can't be represented
 * in the wizard form.
 *
 * @returns Array of error messages describing unsupported configurations
 */
export const validateExtraction = (deployment: KServeDeployment): string[] => {
  const errors: string[] = [];

  const envVars = deployment.model.spec.predictor.model?.env || [];
  const hasValueFromEnvVars = envVars.some((envVar) => envVar.valueFrom != null);

  if (hasValueFromEnvVars) {
    errors.push(
      'One or more environment variables use valueFrom references (e.g. fieldRef, secretKeyRef, configMapKeyRef). The wizard form only supports simple name/value pairs.',
    );
  }

  return errors;
};
