import * as React from 'react';
import { SortableData, Table } from 'mod-arch-shared';
import { ModelVersion, RegisteredModel } from '~/app/types';
type OdhModelVersionsTableProps = {
    data: ModelVersion[];
    columns: SortableData<ModelVersion>[];
    defaultSortColumn: number;
    enablePagination: boolean;
    onClearFilters: () => void;
    emptyTableView: React.ReactNode;
    isArchiveModel?: boolean;
    refresh: () => void;
    rm: RegisteredModel;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;
declare const OdhModelVersionsTable: React.FC<OdhModelVersionsTableProps>;
export default OdhModelVersionsTable;
