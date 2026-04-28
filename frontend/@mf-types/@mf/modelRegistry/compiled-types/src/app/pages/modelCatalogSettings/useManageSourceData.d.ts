import { GenericObjectState } from 'mod-arch-core';
import { CatalogSourceType } from '~/app/modelCatalogTypes';
export type ManageSourceFormData = {
    name: string;
    id: string;
    sourceType: CatalogSourceType;
    accessToken: string;
    organization: string;
    yamlContent: string;
    allowedModels: string;
    excludedModels: string;
    enabled: boolean;
    isDefault: boolean;
};
/**
 * Custom hook to manage form state for adding/editing a catalog source
 * Uses the standard useGenericObjectState pattern from mod-arch-core
 * @param existingData - Optional existing data to pre-populate the form (for edit mode)
 * @returns Generic object state with [formData, setData] pattern
 */
export declare const useManageSourceData: (existingData?: Partial<ManageSourceFormData>) => GenericObjectState<ManageSourceFormData>;
