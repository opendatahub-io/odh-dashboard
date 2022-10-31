import * as React from 'react';
import { InputGroup, SearchInput, Select, SelectOption } from '@patternfly/react-core';

export enum SearchType {
  NAME = 'Name',
  USER = 'User',
}

type ProjectSearchFieldProps = {
  searchType: SearchType;
  onSearchTypeChange: (searchType: SearchType) => void;
  searchValue: string;
  onSearchValueChange: (searchValue: string) => void;
};

const ProjectSearchField: React.FC<ProjectSearchFieldProps> = ({
  searchValue,
  searchType,
  onSearchValueChange,
  onSearchTypeChange,
}) => {
  const [typeOpen, setTypeOpen] = React.useState(false);

  return (
    <InputGroup>
      <Select
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
        {Object.keys(SearchType).map((key) => (
          <SelectOption key={key} value={key}>
            {SearchType[key]}
          </SelectOption>
        ))}
      </Select>
      <SearchInput
        placeholder={`Find by ${searchType.toLowerCase()}`}
        value={searchValue}
        onChange={(newSearch) => {
          onSearchValueChange(newSearch);
        }}
        onClear={() => onSearchValueChange('')}
        style={{ minWidth: '200px' }}
      />
    </InputGroup>
  );
};

export default ProjectSearchField;
