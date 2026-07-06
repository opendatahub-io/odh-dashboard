import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';
import type {
  ModelLocationType,
  RegistrationCommonFormData,
} from '~/app/pages/modelRegistry/screens/RegisterModel/useRegisterModelData';

export type AutofillConnectionButtonExtension = Extension<
  'model-registry.register/autofill-connection',
  {
    component: CodeRef<{
      default: React.ComponentType<{
        modelLocationType: ModelLocationType;
        setData: (
          propKey: keyof Pick<
            RegistrationCommonFormData,
            | 'modelLocationEndpoint'
            | 'modelLocationBucket'
            | 'modelLocationRegion'
            | 'modelLocationURI'
          >,
          propValue: string,
        ) => void;
      }>;
    }>;
  }
>;

export const isAutofillConnectionButtonExtension =
  createExtensionGuard<AutofillConnectionButtonExtension>(
    'model-registry.register/autofill-connection',
  );
