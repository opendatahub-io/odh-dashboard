import { SortableData } from 'mod-arch-shared';
import { CatalogPerformanceMetricsArtifact, PerformanceMetricsCustomProperties } from '~/app/modelCatalogTypes';
export type HardwareConfigColumnField = keyof PerformanceMetricsCustomProperties | 'total_rps';
export type HardwareConfigColumn = Omit<SortableData<CatalogPerformanceMetricsArtifact>, 'field'> & {
    field: HardwareConfigColumnField;
};
export declare const hardwareConfigColumns: HardwareConfigColumn[];
