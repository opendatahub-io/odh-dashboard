import * as React from 'react';
import { CatalogFilterOptions, ModelCatalogStringFilterOptions } from '~/app/modelCatalogTypes';
type ProviderFilterProps = {
    filters?: Extract<CatalogFilterOptions, Partial<ModelCatalogStringFilterOptions>>;
};
declare const ProviderFilter: React.FC<ProviderFilterProps>;
export default ProviderFilter;
