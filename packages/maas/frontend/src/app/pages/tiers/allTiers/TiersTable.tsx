import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button, SearchInput, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import Table from '@odh-dashboard/internal/components/table/Table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { PlusIcon } from '@patternfly/react-icons';
import { Tier } from '~/app/types/tier';
import { tierColumns } from './columns';
import TiersTableRow from './TiersTableRow';
import useTiersFilter from './useTiersFilter';

type TiersTableProps = {
  tiers: Tier[];
  onDeleteTier: (tier: Tier) => void;
};

const TiersTable: React.FC<TiersTableProps> = ({ tiers, onDeleteTier }) => {
  const { filteredTiers, filterValue, setFilterValue, onClearFilters } = useTiersFilter(tiers);

  return (
    <Table
      data-testid="tiers-table"
      id="tiers-table"
      enablePagination
      data={filteredTiers}
      columns={tierColumns}
      defaultSortColumn={1}
      onClearFilters={onClearFilters}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      toolbarContent={
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem style={{ minWidth: '15rem' }}>
              <SearchInput
                placeholder="Filter by name or description"
                value={filterValue}
                onChange={(_event, value) => setFilterValue(value)}
                onClear={() => setFilterValue('')}
                aria-label="Filter tiers"
                data-testid="tiers-filter-input"
              />
            </ToolbarItem>
            <ToolbarItem>
              <Button
                variant="primary"
                component={(props) => <Link {...props} to="/maas/tiers/create" />}
                data-testid="create-tier-button"
                icon={<PlusIcon />}
              >
                Create tier
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      }
      rowRenderer={(tier) => (
        <TiersTableRow key={tier.name} tier={tier} onDeleteTier={onDeleteTier} />
      )}
    />
  );
};

export default TiersTable;
