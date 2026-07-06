import * as React from 'react';
import { Table } from 'mod-arch-shared';
import { ModelVersion } from '~/app/types';
type ModelVersionsArchiveTableProps = {
    clearFilters: () => void;
    modelVersions: ModelVersion[];
    refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;
declare const ModelVersionsArchiveTable: React.FC<ModelVersionsArchiveTableProps>;
export default ModelVersionsArchiveTable;
