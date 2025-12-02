import { ModelCatalogStringFilterOptions, ModelCatalogStringFilterValueType } from '~/app/modelCatalogTypes';
import { ModelCatalogStringFilterKey } from '~/concepts/modelCatalog/const';
type ModelCatalogStringFilterProps<K extends ModelCatalogStringFilterKey> = {
    title: string;
    filterKey: K;
    filterToNameMapping: Partial<Record<ModelCatalogStringFilterValueType[K], string>>;
    filters: ModelCatalogStringFilterOptions[K];
};
declare const ModelCatalogStringFilter: <K extends ModelCatalogStringFilterKey>({ title, filterKey, filterToNameMapping, filters, }: ModelCatalogStringFilterProps<K>) => JSX.Element;
export default ModelCatalogStringFilter;
