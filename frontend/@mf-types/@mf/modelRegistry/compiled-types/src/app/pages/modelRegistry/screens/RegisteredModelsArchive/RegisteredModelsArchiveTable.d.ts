import * as React from 'react';
import { Table } from '~/shared/components/table';
import { RegisteredModel } from '~/app/types';
type RegisteredModelsArchiveTableProps = {
    clearFilters: () => void;
    registeredModels: RegisteredModel[];
    refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;
declare const RegisteredModelsArchiveTable: React.FC<RegisteredModelsArchiveTableProps>;
export default RegisteredModelsArchiveTable;
