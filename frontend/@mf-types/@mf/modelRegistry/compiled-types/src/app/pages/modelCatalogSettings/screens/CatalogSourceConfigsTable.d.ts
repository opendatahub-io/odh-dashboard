import * as React from 'react';
import { CatalogSourceConfig } from '~/app/modelCatalogTypes';
type CatalogSourceConfigsTableProps = {
    catalogSourceConfigs: CatalogSourceConfig[];
    onAddSource: () => void;
    onDeleteSource: (sourceId: string) => Promise<void>;
};
declare const CatalogSourceConfigsTable: React.FC<CatalogSourceConfigsTableProps>;
export default CatalogSourceConfigsTable;
