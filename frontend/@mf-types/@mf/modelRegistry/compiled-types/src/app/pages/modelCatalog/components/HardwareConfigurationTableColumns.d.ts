import { SortableData } from 'mod-arch-shared';
import { CatalogPerformanceMetricsArtifact, PerformanceMetricsCustomProperties } from '~/app/modelCatalogTypes';
export type HardwareConfigColumnField = keyof PerformanceMetricsCustomProperties;
export type HardwareConfigColumn = Omit<SortableData<CatalogPerformanceMetricsArtifact>, 'field'> & {
    field: HardwareConfigColumnField;
};
export declare const hardwareConfigColumns: HardwareConfigColumn[];
/**
 * Fields that should always be visible (sticky columns).
 * These will not appear in the ManageColumnsModal.
 */
export declare const STICKY_COLUMN_FIELDS: HardwareConfigColumnField[];
/**
 * Default visible column fields (excluding sticky - they're always visible).
 * Core metrics: Replicas, Total RPS, RPS/replica, P90 latencies, tokens, vLLM version.
 * NOTE: The latency and TPS will be overridden on mount to match the active latency filter (if any).
 *       See useHardwareConfigColumns.ts for that logic.
 */
export declare const DEFAULT_VISIBLE_COLUMN_FIELDS: HardwareConfigColumnField[];
/**
 * All latency column fields (TTFT, E2E, ITL - excluding TPS which measures throughput).
 */
export declare const LATENCY_COLUMN_FIELDS: HardwareConfigColumnField[];
/**
 * All TPS column fields.
 */
export declare const TPS_COLUMN_FIELDS: HardwareConfigColumnField[];
/**
 * Storage key for localStorage persistence of column visibility.
 */
export declare const HARDWARE_CONFIG_COLUMNS_STORAGE_KEY = "hardware-config-table-columns";
