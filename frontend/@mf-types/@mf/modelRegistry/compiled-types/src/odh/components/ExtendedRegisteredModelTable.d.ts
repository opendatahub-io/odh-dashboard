import * as React from 'react';
import { Table } from 'mod-arch-shared';
import { ModelVersion, RegisteredModel } from '~/app/types';
type ExtendedRegisteredModelTableProps = {
    clearFilters: () => void;
    registeredModels: RegisteredModel[];
    modelVersions: ModelVersion[];
    refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;
declare const ExtendedRegisteredModelTable: React.FC<ExtendedRegisteredModelTableProps>;
export default ExtendedRegisteredModelTable;
