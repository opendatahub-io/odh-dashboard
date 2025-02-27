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
import { MigrationAction } from './migration/types';
import MigrationModal from './migration/MigrationModal';

type HardwareProfilesTableProps = {
  hardwareProfiles: HardwareProfileKind[];
  getMigrationAction: (name: string) => MigrationAction | undefined;
};

const HardwareProfilesTable: React.FC<HardwareProfilesTableProps> = ({
  hardwareProfiles,
  getMigrationAction,
}) => {
  const [deleteHardwareProfile, setDeleteHardwareProfile] = React.useState<
    { hardwareProfile: HardwareProfileKind; migrationAction?: MigrationAction } | undefined
  >();
  const [migrateModalMigrationAction, setMigrateModalMigrationAction] = React.useState<
    MigrationAction | undefined
  >();
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
        rowRenderer={(cr, index) => {
          const migrationAction = getMigrationAction(cr.metadata.name);
          return (
            <HardwareProfilesTableRow
              key={cr.metadata.name}
              rowIndex={index}
              hardwareProfile={cr}
              handleDelete={(hardwareProfile) =>
                setDeleteHardwareProfile({ hardwareProfile, migrationAction })
              }
              handleMigrate={(ma) => setMigrateModalMigrationAction(ma)}
              migrationAction={migrationAction}
            />
          );
        }}
        toolbarContent={
          <HardwareProfilesToolbar onFilterUpdate={onFilterUpdate} filterData={filterData} />
        }
      />
      {migrateModalMigrationAction && (
        <MigrationModal
          migrationAction={migrateModalMigrationAction}
          onClose={() => setMigrateModalMigrationAction(undefined)}
        />
      )}
      {deleteHardwareProfile ? (
        <DeleteHardwareProfileModal
          hardwareProfile={deleteHardwareProfile.hardwareProfile}
          migrationAction={deleteHardwareProfile.migrationAction}
          onClose={() => {
            setDeleteHardwareProfile(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default HardwareProfilesTable;
