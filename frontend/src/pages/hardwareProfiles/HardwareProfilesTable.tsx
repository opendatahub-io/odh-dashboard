import * as React from 'react';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { Table } from '#~/components/table';
import { HardwareProfileKind } from '#~/k8sTypes';
import {
  hardwareProfileColumns,
  HardwareProfileEnableType,
  HardwareProfileFilterDataType,
  initialHardwareProfileFilterData,
} from '#~/pages/hardwareProfiles/const';
import HardwareProfilesTableRow from '#~/pages/hardwareProfiles/HardwareProfilesTableRow';
import DeleteHardwareProfileModal from '#~/pages/hardwareProfiles/DeleteHardwareProfileModal';
import HardwareProfilesToolbar from '#~/pages/hardwareProfiles/HardwareProfilesToolbar';
import { getHardwareProfileDisplayName, isHardwareProfileEnabled } from './utils';

type HardwareProfilesTableProps = {
  hardwareProfiles: HardwareProfileKind[];
};

const HardwareProfilesTable: React.FC<HardwareProfilesTableProps> = ({ hardwareProfiles }) => {
  const [deleteHardwareProfile, setDeleteHardwareProfile] = React.useState<
    HardwareProfileKind | undefined
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
        const visibilityFilter = filterData.Visibility;
        const enabledCr = isHardwareProfileEnabled(cr);
        const displayName = getHardwareProfileDisplayName(cr);
        if (nameFilter && !displayName.toLowerCase().includes(nameFilter)) {
          return false;
        }

        try {
          if (cr.metadata.annotations?.['opendatahub.io/dashboard-feature-visibility']) {
            const visibility = JSON.parse(
              cr.metadata.annotations['opendatahub.io/dashboard-feature-visibility'],
            );
            if (visibilityFilter && !visibility.includes(visibilityFilter)) {
              return false;
            }
          }
        } catch (e) {
          // If the use cases are not set, don't filter
        }

        return (
          !enableFilter ||
          (enableFilter === HardwareProfileEnableType.enabled && enabledCr) ||
          (enableFilter === HardwareProfileEnableType.disabled && !enabledCr)
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
        rowRenderer={(cr) => {
          return (
            <HardwareProfilesTableRow
              key={cr.metadata.name}
              hardwareProfile={cr}
              handleDelete={setDeleteHardwareProfile}
            />
          );
        }}
        toolbarContent={
          <HardwareProfilesToolbar
            onFilterUpdate={onFilterUpdate}
            filterData={filterData}
            showCreateButton={true}
          />
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
