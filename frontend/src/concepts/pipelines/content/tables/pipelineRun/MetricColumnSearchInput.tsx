import React from 'react';
import { SearchInput } from '@patternfly/react-core';

interface MetricColumnSearchInputProps {
  onSearch: (value: string) => void;
}

export const MetricColumnSearchInput: React.FC<MetricColumnSearchInputProps> = ({ onSearch }) => {
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
      placeholder="Filter by metric name"
      value={value}
      onChange={onChange}
      onClear={() => onChange(null, '')}
    />
  );
};
