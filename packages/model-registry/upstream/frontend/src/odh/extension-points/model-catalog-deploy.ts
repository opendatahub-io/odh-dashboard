import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';

export type DeployPrefillData = {
  modelName: string;
  modelUri?: string;
  returnRouteValue?: string;
  cancelReturnRouteValue?: string;
  wizardStartIndex?: number;
  modelType?: 'predictive' | 'generative';
  prefillAlertText?: string;
};

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
