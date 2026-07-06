import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';

export type DeployPrefillData = {
  modelName: string;
  modelUri?: string;
  returnRouteValue?: string;
  cancelReturnRouteValue?: string;
  wizardStartIndex?: number;
  modelType?: ServingRuntimeModelType;
  prefillAlertText?: string;
};

export type NavigateToDeploymentWizardWithDataExtension = Extension<
  'model-catalog.deployment/navigate-wizard',
  {
    useAvailablePlatformIds: CodeRef<() => string[]>;
    useNavigateToDeploymentWizardWithData: CodeRef<
      (deployPrefillData: DeployPrefillData) => (projectName?: string) => void
    >;
  }
>;

export const isNavigateToDeploymentWizardWithDataExtension =
  createExtensionGuard<NavigateToDeploymentWizardWithDataExtension>(
    'model-catalog.deployment/navigate-wizard',
  );
