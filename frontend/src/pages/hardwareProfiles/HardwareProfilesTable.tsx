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
import useDraggableTable from '#~/utilities/useDraggableTable';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import {
  getHardwareProfileDisplayName,
  isHardwareProfileEnabled,
  orderHardwareProfiles,
} from './utils';

type HardwareProfilesTableProps = {
  hardwareProfiles: HardwareProfileKind[];
  hardwareProfileOrder: string[];
  setHardwareProfileOrder: (order: string[]) => void;
};

const HardwareProfilesTable: React.FC<HardwareProfilesTableProps> = ({
  hardwareProfiles,
  hardwareProfileOrder,
  setHardwareProfileOrder,
}) => {
  const [deleteHardwareProfile, setDeleteHardwareProfile] = React.useState<
    HardwareProfileKind | undefined
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
  const orderedHardwareProfiles = orderHardwareProfiles(
    filteredHardwareProfiles,
    hardwareProfileOrder,
  );
  //column sorting with the following cycle: custom → asc → desc → custom
  const { transformData, getColumnSort, isCustomOrder } = useTableColumnSort(
    hardwareProfileColumns,
    [],
    undefined,
    true,
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
        columns={hardwareProfileColumns}
        getColumnSort={getColumnSort}
        emptyTableView={<DashboardEmptyTableView onClearFilters={resetFilters} />}
        rowRenderer={(cr, index) => {
          return (
            <HardwareProfilesTableRow
              {...conditionalRowProps}
              key={cr.metadata.name}
              rowIndex={index}
              hardwareProfile={cr}
              handleDelete={setDeleteHardwareProfile}
              isExpanded={expandedRows.has(cr.metadata.name)}
              onToggleExpansion={() => toggleRowExpansion(cr.metadata.name)}
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
