import * as React from 'react';
import { type FilterPanelItem } from './hooks/useCatalogFilterConfigs';
type CatalogFilterPanelProps = {
    loaded: boolean;
    loadError?: Error;
    filters: FilterPanelItem[];
    extraContent?: React.ReactNode;
    testIdPrefix?: string;
};
declare const CatalogFilterPanel: React.FC<CatalogFilterPanelProps>;
export default CatalogFilterPanel;
