import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
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

export const isAutofillConnectionButtonExtension = (
  extension: Extension,
): extension is AutofillConnectionButtonExtension =>
  extension.type === 'model-registry.register/autofill-connection';
