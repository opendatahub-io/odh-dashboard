import { MetadataAnnotation } from '@odh-dashboard/internal/k8sTypes';
import type { LLMdDeployment } from '../types';

/**
 * Validates an LLMD deployment for configurations that don't map to
 * a specific extract function but can't be represented in the wizard form.
 *
 * @returns Array of error messages describing unsupported configurations
 */
export const validateExtraction = (deployment: LLMdDeployment): string[] => {
  const errors: string[] = [];

  const { template } = deployment.model.spec;

  if (template?.containers && template.containers.length > 1) {
    errors.push(
      `Multiple containers (${template.containers.length}) are configured. The wizard form only supports a single main container.`,
    );
  }

  const hasConnectionAnnotation =
    !!deployment.model.metadata.annotations?.[MetadataAnnotation.ConnectionName];
  const hasImagePullSecrets =
    !!template?.imagePullSecrets?.length && template.imagePullSecrets.length > 0;

  if (!hasConnectionAnnotation && !hasImagePullSecrets) {
    errors.push('No connection could be resolved for this deployment.');
  }

  return errors;
};
