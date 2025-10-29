import * as React from 'react';
import { CatalogFilterOptions, ModelCatalogStringFilterOptions } from '~/app/modelCatalogTypes';
type LicenseFilterProps = {
    filters?: Extract<CatalogFilterOptions, Partial<ModelCatalogStringFilterOptions>>;
};
declare const LicenseFilter: React.FC<LicenseFilterProps>;
export default LicenseFilter;
