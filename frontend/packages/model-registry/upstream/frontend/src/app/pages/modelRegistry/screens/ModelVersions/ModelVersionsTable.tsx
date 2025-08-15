import * as React from 'react';
import { Table } from 'mod-arch-shared';
import { ModelVersion, RegisteredModel } from '~/app/types';
import OdhModelVersionsTable from '~/odh/components/OdhModelVersionsTable';

type ModelVersionsTableProps = {
  clearFilters: () => void;
  modelVersions: ModelVersion[];
  isArchiveModel?: boolean;
  refresh: () => void;
  rm: RegisteredModel;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const ModelVersionsTable: React.FC<ModelVersionsTableProps> = ({
  clearFilters,
  modelVersions,
  toolbarContent,
  isArchiveModel,
  refresh,
  rm,
}) => (
  <OdhModelVersionsTable
    clearFilters={clearFilters}
    modelVersions={modelVersions}
    toolbarContent={toolbarContent}
    isArchiveModel={isArchiveModel}
    refresh={refresh}
    rm={rm}
  />
);

export default ModelVersionsTable;
