import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';
import type { DeployPrefillData } from '@odh-dashboard/model-registry/shared';

export type NavigateToDeploymentWizardWithDataExtension = Extension<
  'model-catalog.deployment/navigate-wizard',
  {
    useAvailablePlatformIds: CodeRef<() => string[]>;
    useNavigateToDeploymentWizardWithData: CodeRef<
      (deployPrefillData: DeployPrefillData) => ((projectName?: string) => void) | null
    >;
  }
>;

export const isNavigateToDeploymentWizardWithDataExtension =
  createExtensionGuard<NavigateToDeploymentWizardWithDataExtension>(
    'model-catalog.deployment/navigate-wizard',
  );
