import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { LimitNameResourceType } from '#~/concepts/k8s/K8sNameDescriptionField/utils';

export type K8sNameDescriptionFieldData = {
  name: string;
  description: string;
  k8sName: {
    value: string;
    state: {
      /** The value cannot be changeable */
      immutable: boolean;
      /** If an invalid character was used */
      invalidCharacters: boolean;
      /** If the maxLength is exceeded */
      invalidLength: boolean;
      /** Optional regexp for the resource name */
      regexp?: RegExp;
      /** Optional invalid characters message */
      invalidCharsMessage?: string;
      /**
       * Optional safe prefix for translation.
       * @see AdditionalCriteriaForTranslation
       */
      safePrefix?: string;
      /**
       * If the safe prefix is to be statically applied
       * @see AdditionalCriteriaForTranslation
       */
      staticPrefix?: boolean;
      /** Max length for the K8s name */
      maxLength: number;
      /** The user is now in control of the value; do not auto generate */
      touched: boolean;
    };
  };
};

export type K8sNameDescriptionType = {
  name?: string;
  k8sName?: string;
  description?: string;
};

export type UseK8sNameDescriptionDataConfiguration = {
  /** Seed the state with initial data */
  initialData?: K8sResourceCommon | K8sNameDescriptionType;
  /** Allow for custom internal logic for limiting k8s names based on their type */
  limitNameResourceType?: LimitNameResourceType;
  /**
   * Provide a safe prefix for the translation function
   * @see AdditionalCriteriaForTranslation
   */
  safePrefix?: string;
  /**
   * If the safe prefix is to be statically applied
   * @see AdditionalCriteriaForTranslation
   */
  staticPrefix?: boolean;
  /** Optional regexp for the resource name */
  regexp?: RegExp;
  /** Optional invalid characters message */
  invalidCharsMessage?: string;
  /** allow the k8sName value to be edited even though it is pre-set */
  editableK8sName?: boolean;
};

type K8sNameDescriptionFieldUpdateFunctionTemplate<T> = (
  key: keyof K8sNameDescriptionFieldData,
  value: string, // always the value; directly or k8sName.value
) => T;
export type K8sNameDescriptionFieldUpdateFunction =
  K8sNameDescriptionFieldUpdateFunctionTemplate<void>;
export type K8sNameDescriptionFieldUpdateFunctionInternal =
  K8sNameDescriptionFieldUpdateFunctionTemplate<K8sNameDescriptionFieldData>;

export type UseK8sNameDescriptionFieldData = {
  data: K8sNameDescriptionFieldData;
  onDataChange: K8sNameDescriptionFieldUpdateFunction;
};
