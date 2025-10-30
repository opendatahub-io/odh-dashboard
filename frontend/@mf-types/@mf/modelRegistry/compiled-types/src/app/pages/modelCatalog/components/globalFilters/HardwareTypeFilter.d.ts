import * as React from 'react';
import { CatalogPerformanceMetricsArtifact } from '~/app/modelCatalogTypes';
type HardwareTypeFilterProps = {
    performanceArtifacts: CatalogPerformanceMetricsArtifact[];
};
declare const HardwareTypeFilter: React.FC<HardwareTypeFilterProps>;
export default HardwareTypeFilter;
