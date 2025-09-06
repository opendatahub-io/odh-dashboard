import * as React from 'react';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { ModelVersion, RegisteredModel } from '~/app/types';
import { getLatestVersionForRegisteredModel } from '~/app/pages/modelRegistry/screens/utils';
import { rmColumns } from '~/app/pages/modelRegistry/screens/RegisteredModels/RegisteredModelsTableColumns';
import { isModelRegistryTableColumnExtension } from '~/odh/extension-points/table';
import ExtendedRegisteredModelTableRow from './ExtendedRegisteredModelTableRow';

type ExtendedRegisteredModelTableProps = {
  clearFilters: () => void;
  registeredModels: RegisteredModel[];
  modelVersions: ModelVersion[];
  refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const ExtendedRegisteredModelTable: React.FC<ExtendedRegisteredModelTableProps> = ({
  clearFilters,
  registeredModels,
  modelVersions,
  toolbarContent,
  refresh,
}) => {
  const [columnExtensions, columnExtensionsLoaded] = useResolvedExtensions(
    isModelRegistryTableColumnExtension,
  );

  const extendedColumns = React.useMemo(() => {
    const columns = [...rmColumns];

    if (columnExtensionsLoaded && columnExtensions.length > 0) {
      // Insert Deployments column between "Latest version" and "Labels"
      const labelsIndex = columns.findIndex((col) => col.field === 'labels');
      const insertIndex = labelsIndex >= 0 ? labelsIndex : 2; // Default to index 2 if labels not found

      columnExtensions.forEach((extension) => {
        const column = extension.properties.column();
        columns.splice(insertIndex, 0, column);
      });
    }

    return columns;
  }, [columnExtensions, columnExtensionsLoaded]);

  return (
    <Table
      data-testid="registered-model-table"
      data={registeredModels}
      columns={extendedColumns}
      toolbarContent={toolbarContent}
      defaultSortColumn={2}
      onClearFilters={clearFilters}
      enablePagination
      emptyTableView={<DashboardEmptyTableView onClearFilters={clearFilters} />}
      rowRenderer={(rm: RegisteredModel) => (
        <ExtendedRegisteredModelTableRow
          key={rm.name}
          hasDeploys={false}
          registeredModel={rm}
          latestModelVersion={getLatestVersionForRegisteredModel(modelVersions, rm.id)}
          refresh={refresh}
        />
      )}
    />
  );
};

export default ExtendedRegisteredModelTable;
