import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';

export type DeployPrefillData = {
  modelName: string;
  modelUri?: string;
  returnRouteValue?: string;
  wizardStartIndex?: number;
}

export type ModelCatalogDeployModalExtension = Extension<
  'model-catalog.model-details/deploy-modal',
  {
    useAvailablePlatformIds: CodeRef<() => string[]>;
  }
>;

export const isModelCatalogDeployModalExtension = (
  extension: Extension,
): extension is ModelCatalogDeployModalExtension =>
  extension.type === 'model-catalog.model-details/deploy-modal';

export type NavigateToDeploymentWizardWithDataExtension = Extension<
  'model-catalog.deployment/navigate-wizard',
  {
    useNavigateToDeploymentWizardWithData: CodeRef<
      (deployPrefillData: DeployPrefillData) => (projectName?: string) => void
    >;
  }
>;

export const isNavigateToDeploymentWizardWithDataExtension = (
  extension: Extension,
): extension is NavigateToDeploymentWizardWithDataExtension =>
  extension.type === 'model-catalog.deployment/navigate-wizard';