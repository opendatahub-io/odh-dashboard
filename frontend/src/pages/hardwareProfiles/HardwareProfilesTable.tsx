import * as React from 'react';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import { Table } from '~/components/table';
import { HardwareProfileKind } from '~/k8sTypes';
import {
  hardwareProfileColumns,
  HardwareProfileEnableType,
  HardwareProfileFilterDataType,
  initialHardwareProfileFilterData,
} from '~/pages/hardwareProfiles/const';
import HardwareProfilesTableRow from '~/pages/hardwareProfiles/HardwareProfilesTableRow';
import DeleteHardwareProfileModal from '~/pages/hardwareProfiles/DeleteHardwareProfileModal';
import HardwareProfilesToolbar from '~/pages/hardwareProfiles/HardwareProfilesToolbar';

type HardwareProfilesTableProps = {
  hardwareProfiles: HardwareProfileKind[];
};

const HardwareProfilesTable: React.FC<HardwareProfilesTableProps> = ({ hardwareProfiles }) => {
  const [deleteHardwareProfile, setDeleteHardwareProfile] = React.useState<HardwareProfileKind>();
  const [filterData, setFilterData] = React.useState<HardwareProfileFilterDataType>(
    initialHardwareProfileFilterData,
  );
  const onClearFilters = React.useCallback(
    () => setFilterData(initialHardwareProfileFilterData),
    [setFilterData],
  );
  const filteredHardwareProfiles = React.useMemo(
    () =>
      hardwareProfiles.filter((cr) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const enableFilter = filterData.Enabled;

        if (nameFilter && !cr.spec.displayName.toLowerCase().includes(nameFilter)) {
          return false;
        }

        return (
          !enableFilter ||
          (enableFilter === HardwareProfileEnableType.enabled && cr.spec.enabled) ||
          (enableFilter === HardwareProfileEnableType.disabled && !cr.spec.enabled)
        );
      }),
    [hardwareProfiles, filterData],
  );

  const resetFilters = () => {
    setFilterData(initialHardwareProfileFilterData);
  };

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <>
      <Table
        onClearFilters={onClearFilters}
        data-testid="hardware-profile-table"
        id="hardware-profile-table"
        enablePagination
        data={filteredHardwareProfiles}
        columns={hardwareProfileColumns}
        defaultSortColumn={1}
        emptyTableView={<DashboardEmptyTableView onClearFilters={resetFilters} />}
        disableRowRenderSupport
        rowRenderer={(cr, index) => (
          <HardwareProfilesTableRow
            key={cr.metadata.name}
            rowIndex={index}
            hardwareProfile={cr}
            handleDelete={(hardwareProfile) => setDeleteHardwareProfile(hardwareProfile)}
          />
        )}
        toolbarContent={
          <HardwareProfilesToolbar onFilterUpdate={onFilterUpdate} filterData={filterData} />
        }
      />
      {deleteHardwareProfile ? (
        <DeleteHardwareProfileModal
          hardwareProfile={deleteHardwareProfile}
          onClose={() => {
            setDeleteHardwareProfile(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default HardwareProfilesTable;
