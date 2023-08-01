import * as React from 'react';
import { InputGroup, SearchInput, Select, SelectOption } from '@patternfly/react-core';

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
}

type DashboardSearchFieldProps = {
  types: string[];
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
}) => {
  const [typeOpen, setTypeOpen] = React.useState(false);

  return (
    <InputGroup>
      <Select
        removeFindDomNode
        isOpen={typeOpen}
        onToggle={() => setTypeOpen(!typeOpen)}
        selections={searchType}
        onSelect={(e, key) => {
          if (typeof key === 'string') {
            onSearchTypeChange(SearchType[key]);
            setTypeOpen(false);
          }
        }}
      >
        {types.map((key) => (
          <SelectOption key={key} value={key}>
            {SearchType[key]}
          </SelectOption>
        ))}
      </Select>
      <SearchInput
        placeholder={`Find by ${searchType.toLowerCase()}`}
        value={searchValue}
        onChange={(_, newSearch) => {
          onSearchValueChange(newSearch);
        }}
        onClear={() => onSearchValueChange('')}
        style={{ minWidth: '200px' }}
      />
    </InputGroup>
  );
};

export default DashboardSearchField;
