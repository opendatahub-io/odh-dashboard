import type { LLMdDeployment } from '../types';

/**
 * Validates an LLMD deployment for configurations that don't map to
 * a specific extract function but can't be represented in the wizard form.
 *
 * @returns Array of error messages describing unsupported configurations
 */
export const validateExtraction = (deployment: LLMdDeployment): string[] => {
  const errors: string[] = [];

  const { template, router } = deployment.model.spec;

  if (template?.containers && template.containers.length > 1) {
    errors.push(
      `Multiple containers (${template.containers.length}) are configured. The wizard form only supports a single main container.`,
    );
  }

  if (router) {
    const routerValues = Object.values(router).filter(Boolean);
    const hasCustomRouter = routerValues.some((value) => Object.keys(value).length > 0);
    if (hasCustomRouter) {
      errors.push(
        'Custom router configuration is present but is not supported in the wizard form.',
      );
    }
  }

  return errors;
};
