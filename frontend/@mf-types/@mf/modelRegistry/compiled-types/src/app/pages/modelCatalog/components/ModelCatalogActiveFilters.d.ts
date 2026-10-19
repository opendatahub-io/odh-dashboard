import React from 'react';
import './ModelCatalogActiveFilters.css';
import { ModelCatalogFilterKey } from '~/app/modelCatalogTypes';
type ModelCatalogActiveFiltersProps = {
    filtersToShow: ModelCatalogFilterKey[];
    /** When true, all ToolbarFilter labels are forced to empty arrays. This keeps the
     *  ToolbarFilter components mounted so their parent Toolbar's internal filter count
     *  stays at zero — working around PF's missing componentWillUnmount cleanup
     *  (https://github.com/patternfly/patternfly-react/issues/12247). */
    forceHideLabels?: boolean;
};
declare const ModelCatalogActiveFilters: React.FC<ModelCatalogActiveFiltersProps>;
export default ModelCatalogActiveFilters;
