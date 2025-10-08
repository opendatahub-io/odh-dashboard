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

  const { extendedColumns, defaultSortColumnIndex } = React.useMemo(() => {
    const columns = [...rmColumns];
    const originalLastModifiedIndex = columns.findIndex((col) => col.field === 'last_modified');

    if (columnExtensionsLoaded && columnExtensions.length > 0) {
      // Insert placeholder columns for extension components
      // The actual rendering is handled in ExtendedRegisteredModelTableRow
      const labelsIndex = columns.findIndex((col) => col.field === 'labels');
      const insertIndex = labelsIndex >= 0 ? labelsIndex : 2; // Default to index 2 if labels not found

      columnExtensions.forEach((extension, index) => {
        columns.splice(insertIndex + index, 0, {
          field: `extension-${index}`,
          label: 'Deployments',
          sortable: false,
          info: {
            popover:
              'This is the total number of deployments that you have permission to access across all versions of the model.',
            popoverProps: {
              position: 'top',
            },
          },
        });
      });
    }

    // Calculate the new index of the "last_modified" column after insertions
    const lastModifiedIndex = columns.findIndex((col) => col.field === 'last_modified');
    const defaultSortIndex = lastModifiedIndex >= 0 ? lastModifiedIndex : originalLastModifiedIndex;

    return {
      extendedColumns: columns,
      defaultSortColumnIndex: defaultSortIndex,
    };
  }, [columnExtensions, columnExtensionsLoaded]);

  // Pre-sort the data by last modified to ensure initial sort
  const sortedRegisteredModels = React.useMemo(() => {
    const lastModifiedColumn = extendedColumns.find((col) => col.field === 'last_modified');
    if (lastModifiedColumn?.sortable && typeof lastModifiedColumn.sortable === 'function') {
      const sortFn = lastModifiedColumn.sortable;
      return [...registeredModels].sort((a, b) => sortFn(a, b, 'last_modified'));
    }
    return registeredModels;
  }, [registeredModels, extendedColumns]);

  return (
    <Table
      data-testid="registered-model-table"
      data={sortedRegisteredModels}
      columns={extendedColumns}
      toolbarContent={toolbarContent}
      defaultSortColumn={defaultSortColumnIndex}
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
