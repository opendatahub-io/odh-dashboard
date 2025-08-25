import * as React from 'react';
import { Table } from 'mod-arch-shared';
import { ModelVersion, RegisteredModel } from '~/app/types';
type OdhModelVersionsTableProps = {
    clearFilters: () => void;
    modelVersions: ModelVersion[];
    isArchiveModel?: boolean;
    refresh: () => void;
    rm: RegisteredModel;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;
declare const OdhModelVersionsTable: React.FC<OdhModelVersionsTableProps>;
export default OdhModelVersionsTable;
