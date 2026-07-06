import { UseManageColumnsResult } from 'mod-arch-shared';
import { CatalogPerformanceMetricsArtifact } from '~/app/modelCatalogTypes';
import { LatencyMetricFieldName } from '~/concepts/modelCatalog/const';
import { HardwareConfigColumn } from './HardwareConfigurationTableColumns';
/** Controlled sort props for the Table component */
export type ControlledTableSortProps = {
    sortIndex: number;
    sortDirection: 'asc' | 'desc';
    onSortIndexChange: (index: number) => void;
    onSortDirectionChange: (direction: 'asc' | 'desc') => void;
};
type UseHardwareConfigColumnsResult = {
    /** Final columns to render in the table (sticky + visible managed columns) */
    columns: HardwareConfigColumn[];
    /** Result from useManageColumns hook, to be passed directly to ManageColumnsModal */
    manageColumnsResult: UseManageColumnsResult<CatalogPerformanceMetricsArtifact>;
    /**
     * Lifted sort state.
     * Simplified by reusing the interface we'll use for the Table assertion.
     */
    sortState: ControlledTableSortProps & {
        sortColumnField: string | null;
    };
};
/**
 * Custom hook that combines useManageColumns with the latency filter effect logic.
 *
 * When the latency filter changes:
 * - The filtered latency column becomes selected
 * - Other latency columns become deselected
 * - The corresponding TPS column becomes selected
 * - Other TPS columns become deselected
 *
 * When the filter is cleared, the current state is preserved.
 */
export declare const useHardwareConfigColumns: (activeLatencyField: LatencyMetricFieldName | undefined) => UseHardwareConfigColumnsResult;
export {};
