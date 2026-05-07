import { K8sNameDescriptionFieldData, K8sNameDescriptionFieldUpdateFunctionInternal, UseK8sNameDescriptionDataConfiguration } from './types';
export declare const MAX_K8S_NAME_LENGTH = 253;
export declare const getMaxLengthErrorMessage: (maxLength: number) => string;
export declare const INVALID_K8S_NAME_CHARACTERS_MESSAGE = "Must start and end with a lowercase letter or number. Valid characters include lowercase letters, numbers, and hyphens (-).";
/**
 * Translates a name to a k8s-safe value.
 * @see https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
 */
export declare const translateDisplayNameForK8s: (name?: string, safePrefix?: string) => string;
export declare const checkValidK8sName: (value: string) => {
    valid: boolean;
    invalidCharacters: boolean;
};
export declare const setupDefaults: (configuration: UseK8sNameDescriptionDataConfiguration) => K8sNameDescriptionFieldData;
export declare const handleUpdateLogic: (currentData: K8sNameDescriptionFieldData) => K8sNameDescriptionFieldUpdateFunctionInternal;
