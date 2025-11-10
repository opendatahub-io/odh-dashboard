import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';

// Minimal data we're prefilling the wizard with
export type InitialWizardFormData = {
  wizardStartIndex?: number;
  modelLocationData?: {
    type: 'new' | 'existing' | 'pvc';
    fieldValues?: Record<string, unknown>;
    additionalFields?: Record<string, unknown>;
    disableInputFields?: boolean;
  };
  createConnectionData?: {
    saveConnection?: boolean;
    hideFields?: boolean;
  };
  modelTypeField?: string;
  k8sNameDesc?: {
    name?: string;
    description?: string;
    k8sName?: {
      value?: string;
      state?: {
        immutable?: boolean;
        invalidCharacters?: boolean;
        invalidLength?: boolean;
        maxLength?: number;
        touched?: boolean;
      };
    };
  };
};

export type Deployment = {
  modelServingPlatformId: string;
  model: {
    metadata: {
      name: string;
      namespace: string;
    };
  };
  server?: {
    metadata: {
      name: string;
      namespace: string;
    };
  };
};

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