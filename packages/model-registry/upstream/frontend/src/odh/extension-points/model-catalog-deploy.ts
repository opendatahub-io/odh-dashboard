import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { InitialWizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { Deployment } from '@odh-dashboard/model-serving/extension-points';
import type { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';

export type ModelCatalogDeployModalExtension = Extension<
  'model-catalog.model-details/deploy-modal',
  {
    useAvailablePlatformIds: CodeRef<() => string[]>;
    modalComponent: CodeRef<
      React.ComponentType<{
        modelDeployPrefill: {
          data: ModelDeployPrefillInfo;
          loaded: boolean;
          error: Error | undefined;
        };
        onSubmit: () => void;
        onClose: () => void;
      }>
    >;
  }
>;

export const isModelCatalogDeployModalExtension = (
  extension: Extension,
): extension is ModelCatalogDeployModalExtension =>
  extension.type === 'model-catalog.model-details/deploy-modal';

  export type NavigateToWizardExtension = Extension<
  'model-serving.deployment/navigate-wizard',
  {
    useNavigateToDeploymentWizard: CodeRef<
      (deployment?: Deployment | null, initialData?: InitialWizardFormData | null, returnRouteValue?: string) => (projectName?: string) => void
    >;
  }
>;

export const isNavigateToWizardExtension = (
  extension: Extension,
): extension is NavigateToWizardExtension =>
  extension.type === 'model-serving.deployment/navigate-wizard';