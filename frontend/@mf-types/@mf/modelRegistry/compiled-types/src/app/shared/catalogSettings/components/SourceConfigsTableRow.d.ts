import * as React from 'react';
import { LabelProps } from '@patternfly/react-core';
export type SourceConfigRowBase = {
    id: string;
    name: string;
    enabled?: boolean;
    isDefault?: boolean;
};
export type SourceVisibilityLabelInfo = {
    text: string;
    color: LabelProps['color'];
    variant?: LabelProps['variant'];
    testId: string;
};
type SourceConfigsTableRowProps<TConfig extends SourceConfigRowBase> = {
    sourceConfig: TConfig;
    isUpdatingToggle: boolean;
    onToggleUpdate: (checked: boolean, config: TConfig) => void;
    onDeleteSource: (sourceId: string) => Promise<void>;
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
declare const SourceConfigsTableRow: <TConfig extends SourceConfigRowBase>({ sourceConfig, isUpdatingToggle, onToggleUpdate, onDeleteSource, getManageSourceUrl, renderExtraCells, visibilityColumnLabel, getVisibilityLabel, getSourceTypeLabel, StatusComponent, testIdPrefix, deleteModalTitle, deleteModalBody, }: SourceConfigsTableRowProps<TConfig>) => React.ReactElement;
export default SourceConfigsTableRow;
