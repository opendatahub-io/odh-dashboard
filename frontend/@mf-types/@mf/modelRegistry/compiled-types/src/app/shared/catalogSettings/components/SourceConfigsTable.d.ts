import * as React from 'react';
import { SortableData } from 'mod-arch-shared';
import { SourceConfigRowBase, SourceVisibilityLabelInfo } from './SourceConfigsTableRow';
type SourceConfigsTableProps<TConfig extends SourceConfigRowBase> = {
    sourceConfigs: TConfig[];
    columns: SortableData<TConfig>[];
    onAddSource: () => void;
    addSourceLabel: string;
    onDeleteSource: (sourceId: string) => Promise<void>;
    apiAvailable: boolean;
    /** Performs the enable/disable mutation (and any related refreshes); assumes the API is available. */
    onToggleUpdate: (checked: boolean, config: TConfig) => Promise<void>;
    loadError?: Error;
    getManageSourceUrl: (id: string) => string;
    renderExtraCells?: (config: TConfig) => React.ReactNode;
    visibilityColumnLabel: string;
    getVisibilityLabel: (config: TConfig) => SourceVisibilityLabelInfo;
    getSourceTypeLabel: (config: TConfig) => string;
    StatusComponent: React.ComponentType<{
        sourceConfig: TConfig;
    }>;
    testIdPrefix?: string;
    deleteModalTitle?: string;
    deleteModalBody: (config: TConfig) => React.ReactNode;
};
declare const SourceConfigsTable: <TConfig extends SourceConfigRowBase>({ sourceConfigs, columns, onAddSource, addSourceLabel, onDeleteSource, apiAvailable, onToggleUpdate, loadError, getManageSourceUrl, renderExtraCells, visibilityColumnLabel, getVisibilityLabel, getSourceTypeLabel, StatusComponent, testIdPrefix, deleteModalTitle, deleteModalBody, }: SourceConfigsTableProps<TConfig>) => React.ReactElement;
export default SourceConfigsTable;
