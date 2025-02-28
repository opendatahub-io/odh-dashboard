import * as React from 'react';
import { Table } from '~/shared/components/table';
import { ModelVersion } from '~/app/types';
type ModelVersionsTableProps = {
    clearFilters: () => void;
    modelVersions: ModelVersion[];
    isArchiveModel?: boolean;
    refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;
declare const ModelVersionsTable: React.FC<ModelVersionsTableProps>;
export default ModelVersionsTable;
