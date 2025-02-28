import * as React from 'react';
import { Table } from '~/shared/components/table';
import { RegisteredModel } from '~/app/types';
type RegisteredModelTableProps = {
    clearFilters: () => void;
    registeredModels: RegisteredModel[];
    refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;
declare const RegisteredModelTable: React.FC<RegisteredModelTableProps>;
export default RegisteredModelTable;
