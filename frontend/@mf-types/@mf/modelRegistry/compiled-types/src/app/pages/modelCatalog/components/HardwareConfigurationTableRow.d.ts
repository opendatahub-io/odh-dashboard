import * as React from 'react';
import { CatalogPerformanceMetricsArtifact } from '~/app/modelCatalogTypes';
import { HardwareConfigColumn } from './HardwareConfigurationTableColumns';
type HardwareConfigurationTableRowProps = {
    performanceArtifact: CatalogPerformanceMetricsArtifact;
    columns: HardwareConfigColumn[];
};
declare const HardwareConfigurationTableRow: React.FC<HardwareConfigurationTableRowProps>;
export default HardwareConfigurationTableRow;
