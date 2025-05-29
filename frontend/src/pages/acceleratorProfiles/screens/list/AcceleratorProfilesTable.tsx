import * as React from 'react';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { Table } from '#~/components/table';
import AcceleratorProfilesTableRow from '#~/pages/acceleratorProfiles/screens/list/AcceleratorProfilesTableRow';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import {
  columns,
  initialAcceleratorProfilesFilterData,
  AcceleratorProfilesFilterDataType,
} from '#~/pages/acceleratorProfiles/screens/list/const';
import DeleteAcceleratorProfileModal from './DeleteAcceleratorProfileModal';
import AcceleratorProfilesToolbar from './AcceleratorProfilesToolbar';

type AcceleratorProfilesTableProps = {
  acceleratorProfiles: AcceleratorProfileKind[];
  refreshAcceleratorProfiles: () => void;
};

const AcceleratorProfilesTable: React.FC<AcceleratorProfilesTableProps> = ({
  acceleratorProfiles,
  refreshAcceleratorProfiles,
}) => {
  const [filterData, setFilterData] = React.useState<AcceleratorProfilesFilterDataType>(
    initialAcceleratorProfilesFilterData,
  );
  const [deleteAcceleratorProfile, setDeleteAcceleratorProfile] = React.useState<
    AcceleratorProfileKind | undefined
  >();

  const filteredAcceleratorProfiles = React.useMemo(
    () =>
      acceleratorProfiles.filter((cr) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const indentifierFilter = filterData.Identifier?.toLowerCase();

        if (nameFilter && !cr.spec.displayName.toLowerCase().includes(nameFilter.toLowerCase())) {
          return false;
        }

        return (
          !indentifierFilter ||
          cr.spec.identifier.toLowerCase().includes(indentifierFilter.toLowerCase())
        );
      }),
    [acceleratorProfiles, filterData],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialAcceleratorProfilesFilterData),
    [setFilterData],
  );

  return (
    <>
      <Table
        data-testid="accelerator-profile-table"
        id="accelerator-profile-table"
        enablePagination
        data={filteredAcceleratorProfiles}
        columns={columns}
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        rowRenderer={(cr) => (
          <AcceleratorProfilesTableRow
            key={cr.metadata.name}
            acceleratorProfile={cr}
            handleDelete={(acceleratorProfile) => setDeleteAcceleratorProfile(acceleratorProfile)}
          />
        )}
        onClearFilters={onClearFilters}
        toolbarContent={
          <AcceleratorProfilesToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
        }
      />
      {deleteAcceleratorProfile ? (
        <DeleteAcceleratorProfileModal
          acceleratorProfile={deleteAcceleratorProfile}
          onClose={(deleted) => {
            if (deleted) {
              refreshAcceleratorProfiles();
            }
            setDeleteAcceleratorProfile(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default AcceleratorProfilesTable;
