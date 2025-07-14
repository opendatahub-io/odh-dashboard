import * as React from 'react';
import { FilterDataType, initialFilterData } from '#~/pages/connectionTypes/const';
import { connectionTypeColumns } from '#~/pages/connectionTypes/columns';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import ConnectionTypesTableRow from '#~/pages/connectionTypes/ConnectionTypesTableRow';
import ConnectionTypesTableToolbar from '#~/pages/connectionTypes/ConnectionTypesTableToolbar';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { Table } from '#~/components/table';
import DeleteConnectionTypeModal from '#~/pages/connectionTypes/DeleteConnectionTypeModal';
import {
  getCreatorFromK8sResource,
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '#~/concepts/k8s/utils';

type Props = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  onUpdate: () => void;
};

const ConnectionTypesTable: React.FC<Props> = ({ connectionTypes, onUpdate }) => {
  const [filterData, setFilterData] = React.useState<FilterDataType>(initialFilterData);
  const onClearFilters = React.useCallback(() => setFilterData(initialFilterData), []);

  const [deleteConnectionType, setDeleteConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >();

  const filteredConnectionTypes = React.useMemo(
    () =>
      connectionTypes.filter((connectionType) => {
        const keywordFilter = filterData.Keyword?.toLowerCase();
        const createFilter = filterData.Creator?.toLowerCase();
        const categoryFilter = filterData.Category?.toLowerCase();

        if (
          keywordFilter &&
          !getDisplayNameFromK8sResource(connectionType).toLowerCase().includes(keywordFilter) &&
          !getDescriptionFromK8sResource(connectionType).toLowerCase().includes(keywordFilter)
        ) {
          return false;
        }

        if (
          categoryFilter &&
          !connectionType.data?.category?.find((category) =>
            category.toLowerCase().includes(categoryFilter),
          )
        ) {
          return false;
        }

        return (
          !createFilter ||
          getCreatorFromK8sResource(connectionType).toLowerCase().includes(createFilter)
        );
      }),
    [connectionTypes, filterData],
  );

  return (
    <>
      <Table
        isStriped
        style={{ tableLayout: 'fixed' }}
        data={filteredConnectionTypes}
        columns={connectionTypeColumns}
        defaultSortColumn={0}
        data-testid="connection-types-table"
        rowRenderer={(connectionType) => (
          <ConnectionTypesTableRow
            key={connectionType.metadata.name}
            obj={connectionType}
            onUpdate={onUpdate}
            handleDelete={(connection) => setDeleteConnectionType(connection)}
          />
        )}
        onClearFilters={onClearFilters}
        toolbarContent={
          <ConnectionTypesTableToolbar filterData={filterData} setFilterData={setFilterData} />
        }
        disableItemCount
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        id="connectionTypes-list-table"
      />
      {deleteConnectionType ? (
        <DeleteConnectionTypeModal
          connectionType={deleteConnectionType}
          onClose={(deleted) => {
            if (deleted) {
              onUpdate();
            }
            setDeleteConnectionType(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default ConnectionTypesTable;
