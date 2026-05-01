import * as React from 'react';
import { CatalogFilterOptions, ModelCatalogStringFilterOptions } from '~/app/modelCatalogTypes';
type TensorTypeFilterProps = {
    filters?: Extract<CatalogFilterOptions, Partial<ModelCatalogStringFilterOptions>>;
};
declare const TensorTypeFilter: React.FC<TensorTypeFilterProps>;
export default TensorTypeFilter;
