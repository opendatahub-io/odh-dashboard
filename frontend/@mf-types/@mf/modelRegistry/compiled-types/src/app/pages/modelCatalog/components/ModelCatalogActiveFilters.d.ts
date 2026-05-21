import React from 'react';
import './ModelCatalogActiveFilters.css';
import { ModelCatalogFilterKey } from '~/app/modelCatalogTypes';
type ModelCatalogActiveFiltersProps = {
    filtersToShow: ModelCatalogFilterKey[];
};
declare const ModelCatalogActiveFilters: React.FC<ModelCatalogActiveFiltersProps>;
export default ModelCatalogActiveFilters;
