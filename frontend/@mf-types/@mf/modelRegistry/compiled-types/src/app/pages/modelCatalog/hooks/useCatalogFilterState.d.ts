import { ModelCatalogStringFilterKey, ModelCatalogNumberFilterKey } from '~/concepts/modelCatalog/const';
import { ModelCatalogStringFilterValueType } from '~/app/modelCatalogTypes';
export declare const useCatalogStringFilterState: <K extends ModelCatalogStringFilterKey>(filterKey: K) => {
    selectedValues: string[];
    isSelected: (value: ModelCatalogStringFilterValueType[K]) => boolean;
    setSelected: (value: string, selected: boolean) => void;
};
export declare const useCatalogNumberFilterState: (filterKey: ModelCatalogNumberFilterKey) => {
    value: number | undefined;
    setValue: (value: number | undefined) => void;
};
