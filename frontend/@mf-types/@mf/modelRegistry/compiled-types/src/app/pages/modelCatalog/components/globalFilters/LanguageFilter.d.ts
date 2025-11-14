import * as React from 'react';
import { CatalogFilterOptions, ModelCatalogStringFilterOptions } from '~/app/modelCatalogTypes';
type LanguageFilterProps = {
    filters?: Extract<CatalogFilterOptions, Partial<ModelCatalogStringFilterOptions>>;
};
declare const LanguageFilter: React.FC<LanguageFilterProps>;
export default LanguageFilter;
