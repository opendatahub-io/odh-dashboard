import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { RegisteredModel, ModelVersion, ModelArtifact } from '~/app/types';
import { RegisterVersionFormData } from './useRegisterModelData';
type UsePrefillRegisterVersionFieldsArgs = {
    registeredModel?: RegisteredModel;
    setData: UpdateObjectAtPropAndValue<RegisterVersionFormData>;
};
type UsePrefillRegisterVersionFieldsReturnVal = {
    loadedPrefillData: boolean;
    loadPrefillDataError?: Error;
    latestVersion?: ModelVersion;
    latestArtifact?: ModelArtifact;
};
export declare const usePrefillRegisterVersionFields: ({ registeredModel, setData, }: UsePrefillRegisterVersionFieldsArgs) => UsePrefillRegisterVersionFieldsReturnVal;
export {};
