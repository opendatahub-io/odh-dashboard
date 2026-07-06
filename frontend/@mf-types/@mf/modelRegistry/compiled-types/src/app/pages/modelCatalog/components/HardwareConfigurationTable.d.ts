import * as React from 'react';
import { CatalogPerformanceMetricsArtifact } from '~/app/modelCatalogTypes';
type HardwareConfigurationTableProps = {
    performanceArtifacts: CatalogPerformanceMetricsArtifact[];
    isLoading?: boolean;
    onSortChange?: (sort: {
        orderBy?: string;
        sortOrder?: string;
    }) => void;
};
declare const HardwareConfigurationTable: React.FC<HardwareConfigurationTableProps>;
export default HardwareConfigurationTable;
