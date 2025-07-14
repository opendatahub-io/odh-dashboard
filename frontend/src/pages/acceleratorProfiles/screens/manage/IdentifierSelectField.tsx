import React, { useMemo } from 'react';
import { TextInput } from '@patternfly/react-core';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';

type IdentifierSelectFieldProps = {
  value: string;
  onChange: (identifier: string) => void;
  identifierOptions: string[];
};

export const IdentifierSelectField: React.FC<IdentifierSelectFieldProps> = ({
  value,
  onChange,
  identifierOptions = [],
}) => {
  // remove possible duplicates
  const options = useMemo(
    () =>
      Array.from(new Set(identifierOptions)).map(
        (option): SimpleSelectOption => ({
          key: option,
          label: option,
        }),
      ),
    [identifierOptions],
  );

  if (options.length >= 1) {
    return (
      <SimpleSelect
        id="accelerator-identifier-select"
        dataTestId="accelerator-button"
        isFullWidth
        value={value}
        options={options}
        onChange={onChange}
        shouldFocusToggleOnSelect
        placeholder="Select an identifier"
      />
    );
  }

  return (
    <TextInput
      isRequired
      value={value}
      id="accelerator-identifier"
      name="accelerator-identifier"
      onChange={(_, identifier) => onChange(identifier)}
      placeholder="Example, nvidia.com/gpu"
      aria-label="Identifier"
      data-testid="accelerator-identifier-input"
    />
  );
};
