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
import { createHardwareProfileFromResource } from '#~/api';
import useDraggableTable from '#~/utilities/useDraggableTable';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import { MigrationAction } from './migration/types';
import MigrationModal from './migration/MigrationModal';
import {
  getHardwareProfileDisplayName,
  isHardwareProfileEnabled,
  orderHardwareProfiles,
} from './utils';

type HardwareProfilesTableProps = {
  hardwareProfiles: HardwareProfileKind[];
  hardwareProfileOrder: string[];
  setHardwareProfileOrder: (order: string[]) => void;
  getMigrationAction?: (name: string) => MigrationAction | undefined;
  isMigratedTable?: boolean;
};

const HardwareProfilesTable: React.FC<HardwareProfilesTableProps> = ({
  hardwareProfiles,
  hardwareProfileOrder,
  setHardwareProfileOrder,
  getMigrationAction,
  isMigratedTable = false,
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
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const toggleRowExpansion = React.useCallback((hardwareProfileName: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(hardwareProfileName)) {
        newSet.delete(hardwareProfileName);
      } else {
        newSet.add(hardwareProfileName);
      }
      return newSet;
    });
  }, []);

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

  const filteredColumns = React.useMemo(
    () =>
      hardwareProfileColumns.filter(
        (column) =>
          (isMigratedTable &&
            column.field !== 'last_modified' &&
            column.field !== 'drag-drop-handle') ||
          (!isMigratedTable && column.field !== 'source'),
      ),
    [isMigratedTable],
  );

  const orderedHardwareProfiles = orderHardwareProfiles(
    filteredHardwareProfiles,
    hardwareProfileOrder,
  );
  //column sorting with the following cycle: custom → asc → desc → custom
  const { transformData, getColumnSort, isCustomOrder } = useTableColumnSort(
    filteredColumns,
    [],
    undefined,
    !isMigratedTable,
  );
  const displayedHardwareProfiles = transformData(orderedHardwareProfiles);
  const currentOrder = displayedHardwareProfiles.map((profile) => profile.metadata.name);
  //drag-and-drop for persisted ordering, close expanded rows when dragging
  const { tableProps, rowProps } = useDraggableTable(currentOrder, setHardwareProfileOrder, {
    onDragStart: () => setExpandedRows(new Set()),
  });

  const conditionalTableProps = isCustomOrder ? tableProps : {};
  const conditionalRowProps = isCustomOrder ? rowProps : {};

  return (
    <>
      <Table
        {...conditionalTableProps}
        onClearFilters={onClearFilters}
        data-testid="hardware-profile-table"
        id="hardware-profile-table"
        enablePagination
        data={displayedHardwareProfiles}
        columns={filteredColumns}
        getColumnSort={getColumnSort}
        emptyTableView={<DashboardEmptyTableView onClearFilters={resetFilters} />}
        rowRenderer={(cr, index) => {
          const migrationAction = getMigrationAction?.(cr.metadata.name);
          return (
            <HardwareProfilesTableRow
              {...conditionalRowProps}
              key={cr.metadata.name}
              rowIndex={index}
              hardwareProfile={cr}
              handleDelete={(hardwareProfile) =>
                setDeleteHardwareProfile({ hardwareProfile, migrationAction })
              }
              handleMigrate={(ma) => setMigrateModalMigrationAction(ma)}
              migrationAction={migrationAction}
              isExpanded={expandedRows.has(cr.metadata.name)}
              onToggleExpansion={() => toggleRowExpansion(cr.metadata.name)}
            />
          );
        }}
        toolbarContent={
          <HardwareProfilesToolbar
            onFilterUpdate={onFilterUpdate}
            filterData={filterData}
            showCreateButton={!isMigratedTable}
          />
        }
      />
      {migrateModalMigrationAction && (
        <MigrationModal
          migrationAction={migrateModalMigrationAction}
          onClose={() => setMigrateModalMigrationAction(undefined)}
          onMigrate={async () => {
            const getMigrationPromises = (dryRun: boolean) => [
              // delete source resource
              migrateModalMigrationAction.deleteSourceResource({ dryRun }),
              // create dependent profiles
              ...migrateModalMigrationAction.dependentProfiles.map((profile) =>
                createHardwareProfileFromResource(profile, { dryRun }),
              ),
              // create target profile
              createHardwareProfileFromResource(migrateModalMigrationAction.targetProfile, {
                dryRun,
              }),
            ];
            return Promise.all(getMigrationPromises(true)).then(() =>
              Promise.all(getMigrationPromises(false)),
            );
          }}
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
