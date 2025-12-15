import React from 'react';
import { SearchInput } from '@patternfly/react-core';

interface ColumnSearchInputProps {
  onSearch: (value: string) => void;
  placeholder?: string;
}

export const ColumnSearchInput: React.FC<ColumnSearchInputProps> = ({
  onSearch,
  placeholder = 'Filter by column name',
}) => {
  const [value, setValue] = React.useState<string>();

  const onChange = React.useCallback(
    (_: React.FormEvent<HTMLInputElement> | null, newValue: string) => {
      setValue(newValue);
      onSearch(newValue);
    },
    [onSearch],
  );

  return (
    <SearchInput
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onClear={() => onChange(null, '')}
    />
  );
};
