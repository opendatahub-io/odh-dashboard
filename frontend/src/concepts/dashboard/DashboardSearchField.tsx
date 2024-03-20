import * as React from 'react';
import { InputGroup, SearchInput, InputGroupItem } from '@patternfly/react-core';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';

// List all the possible search fields here
export enum SearchType {
  NAME = 'Name',
  DESCRIPTION = 'Description',
  USER = 'User',
  PROJECT = 'Project',
  METRIC = 'Metric',
  PROTECTED_ATTRIBUTE = 'Protected attribute',
  PRIVILEGED_VALUE = 'Privileged value',
  UNPRIVILEGED_VALUE = 'Unprivileged value',
  OUTPUT = 'Output',
  OUTPUT_VALUE = 'Output value',
  PROVIDER = 'Provider',
  IDENTIFIER = 'Identifier',
}

type DashboardSearchFieldProps = {
  types: SearchType[];
  searchType: SearchType;
  onSearchTypeChange: (searchType: SearchType) => void;
  searchValue: string;
  onSearchValueChange: (searchValue: string) => void;
};

const DashboardSearchField: React.FC<DashboardSearchFieldProps> = ({
  types,
  searchValue,
  searchType,
  onSearchValueChange,
  onSearchTypeChange,
}) => (
  <InputGroup data-testid="dashboard-table-toolbar">
    <InputGroupItem>
      <SimpleDropdownSelect
        aria-label="Filter type"
        data-testid="filter-dropdown-select"
        options={types.map((key) => ({
          key,
          label: key,
        }))}
        value={searchType}
        onChange={(key) => {
          onSearchTypeChange(key as SearchType);
        }}
      />
    </InputGroupItem>
    <InputGroupItem>
      <SearchInput
        placeholder={`Find by ${searchType.toLowerCase()}`}
        value={searchValue}
        onChange={(_, newSearch) => {
          onSearchValueChange(newSearch);
        }}
        onClear={() => onSearchValueChange('')}
        style={{ minWidth: '200px' }}
      />
    </InputGroupItem>
  </InputGroup>
);

export default DashboardSearchField;
