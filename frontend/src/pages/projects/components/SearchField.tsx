import * as React from 'react';
import { InputGroup, SearchInput, InputGroupItem } from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';

export enum SearchType {
  NAME = 'Name',
  USER = 'User',
}

type SearchFieldProps = {
  types: SearchType[];
  searchType: SearchType;
  onSearchTypeChange: (searchType: SearchType) => void;
  searchValue: string;
  onSearchValueChange: (searchValue: string) => void;
};

const SearchField: React.FC<SearchFieldProps> = ({
  types,
  searchValue,
  searchType,
  onSearchValueChange,
  onSearchTypeChange,
}) => {
  const [typeOpen, setTypeOpen] = React.useState(false);

  return (
    <InputGroup>
      <InputGroupItem>
        <Select
          toggleId="search-field-toggle"
          removeFindDomNode
          isOpen={typeOpen}
          onToggle={() => setTypeOpen(!typeOpen)}
          selections={searchType}
          onSelect={(e, key) => {
            if (typeof key === 'string') {
              onSearchTypeChange(key as SearchType);
              setTypeOpen(false);
            }
          }}
        >
          {types.map((key) => (
            <SelectOption key={key} value={key}>
              {key}
            </SelectOption>
          ))}
        </Select>
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
};

export default SearchField;
