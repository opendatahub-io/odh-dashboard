import * as React from 'react';
import { Button, ToolbarItem } from '@patternfly/react-core';
import Table from '~/components/table/Table';
import DashboardSearchField, { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import BiasConfigurationTableRow from './BiasConfigurationTableRow';
import { columns } from './tableData';
import BiasConfigurationEmptyState from './BiasConfigurationEmptyState';

type BiasConfigurationTableProps = {
  configurations: BiasMetricConfig[];
};

const BiasConfigurationTable: React.FC<BiasConfigurationTableProps> = ({ configurations }) => {
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');
  const filteredConfigurations = configurations.filter((configuration) => {
    if (!search) {
      return true;
    }

    // TODO: add more search types
    switch (searchType) {
      case SearchType.NAME:
        return configuration.name.toLowerCase().includes(search.toLowerCase());
      case SearchType.PROTECTED_ATTRIBUTE:
        return configuration.protectedAttribute.toLowerCase().includes(search.toLowerCase());
      case SearchType.OUTPUT:
        return configuration.outcomeName.toLowerCase().includes(search.toLowerCase());
      default:
        return true;
    }
  });

  const resetFilters = () => {
    setSearch('');
  };

  // TODO: decide what we want to search
  // Or should we reuse the complex filter search
  const searchTypes = React.useMemo(
    () =>
      Object.keys(SearchType).filter(
        (key) =>
          SearchType[key] === SearchType.NAME ||
          SearchType[key] === SearchType.PROTECTED_ATTRIBUTE ||
          SearchType[key] === SearchType.OUTPUT,
      ),
    [],
  );
  return (
    <Table
      data={filteredConfigurations}
      columns={columns}
      disableRowRenderSupport
      rowRenderer={(configuration, i) => (
        <BiasConfigurationTableRow key={configuration.id} obj={configuration} rowIndex={i} />
      )}
      emptyTableView={
        search ? (
          <>
            No metric configurations match your filters.{' '}
            <Button variant="link" isInline onClick={resetFilters}>
              Clear filters
            </Button>
          </>
        ) : (
          <BiasConfigurationEmptyState />
        )
      }
      toolbarContent={
        <>
          <ToolbarItem>
            <DashboardSearchField
              types={searchTypes}
              searchType={searchType}
              searchValue={search}
              onSearchTypeChange={(searchType) => {
                setSearchType(searchType);
              }}
              onSearchValueChange={(searchValue) => {
                setSearch(searchValue);
              }}
            />
          </ToolbarItem>
          <ToolbarItem>
            {/* TODO: add configure metric action */}
            <Button variant="secondary">Configure metric</Button>
          </ToolbarItem>
        </>
      }
    />
  );
};

export default BiasConfigurationTable;
