import * as React from 'react';
import { Table } from 'mod-arch-shared';
import { ModelVersion } from '~/app/types';
import OdhModelVersionsTable from '~/odh/components/OdhModelVersionsTable';

type ModelVersionsTableProps = {
  clearFilters: () => void;
  modelVersions: ModelVersion[];
  isArchiveModel?: boolean;
  refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const ModelVersionsTable: React.FC<ModelVersionsTableProps> = ({
  clearFilters,
  modelVersions,
  toolbarContent,
  isArchiveModel,
  refresh,
}) => (
  <OdhModelVersionsTable
    clearFilters={clearFilters}
    modelVersions={modelVersions}
    toolbarContent={toolbarContent}
    isArchiveModel={isArchiveModel}
    refresh={refresh}
  />
);

export default ModelVersionsTable;
