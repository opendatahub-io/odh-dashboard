import * as React from 'react';
import { CatalogSourceConfig } from '~/app/modelCatalogTypes';
type CatalogSourceConfigsTableRowProps = {
    catalogSourceConfig: CatalogSourceConfig;
    onDeleteSource: (sourceId: string) => Promise<void>;
    isUpdatingToggle: boolean;
    onToggleUpdate: (checked: boolean, sourceConfig: CatalogSourceConfig) => void;
};
declare const CatalogSourceConfigsTableRow: React.FC<CatalogSourceConfigsTableRowProps>;
export default CatalogSourceConfigsTableRow;
