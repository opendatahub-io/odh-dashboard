import * as React from 'react';
import { Button, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import DashboardSearchField, { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import { Table } from '~/components/table';
import AcceleratorProfilesTableRow from '~/pages/acceleratorProfiles/screens/list/AcceleratorProfilesTableRow';
import { AcceleratorProfileKind } from '~/k8sTypes';
import { columns } from '~/pages/acceleratorProfiles/screens/list/const';
import DeleteAcceleratorProfileModal from './DeleteAcceleratorProfileModal';

type AcceleratorProfilesTableProps = {
  acceleratorProfiles: AcceleratorProfileKind[];
  refreshAcceleratorProfiles: () => void;
};

const AcceleratorProfilesTable: React.FC<AcceleratorProfilesTableProps> = ({
  acceleratorProfiles,
  refreshAcceleratorProfiles,
}) => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');
  const [deleteAcceleratorProfile, setDeleteAcceleratorProfile] = React.useState<
    AcceleratorProfileKind | undefined
  >();
  const filteredAcceleratorProfiles = acceleratorProfiles.filter((cr) => {
    if (!search) {
      return true;
    }

    switch (searchType) {
      case SearchType.NAME:
        return cr.spec.displayName.toLowerCase().includes(search.toLowerCase());
      case SearchType.IDENTIFIER:
        return cr.spec.identifier.toLowerCase().includes(search.toLowerCase());
      default:
        return true;
    }
  });

  const searchTypes = React.useMemo(() => [SearchType.NAME, SearchType.IDENTIFIER], []);

  return (
    <>
      <Table
        data-testid="accelerator-profile-table"
        id="accelerator-profile-table"
        enablePagination
        data={filteredAcceleratorProfiles}
        columns={columns}
        emptyTableView={<DashboardEmptyTableView onClearFilters={() => setSearch('')} />}
        rowRenderer={(cr) => (
          <AcceleratorProfilesTableRow
            key={cr.metadata.name}
            acceleratorProfile={cr}
            handleDelete={(acceleratorProfile) => setDeleteAcceleratorProfile(acceleratorProfile)}
          />
        )}
        toolbarContent={
          <>
            <ToolbarItem>
              <DashboardSearchField
                types={searchTypes}
                searchType={searchType}
                searchValue={search}
                onSearchTypeChange={(newSearchType) => {
                  setSearchType(newSearchType);
                }}
                onSearchValueChange={(searchValue) => {
                  setSearch(searchValue);
                }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Button
                data-testid="create-accelerator-profile"
                onClick={() => navigate(`/acceleratorProfiles/create`)}
              >
                Create hardware profile
              </Button>
            </ToolbarItem>
          </>
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
