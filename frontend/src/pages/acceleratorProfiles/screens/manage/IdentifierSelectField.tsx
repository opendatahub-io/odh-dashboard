import { MenuToggle, Select, SelectList, SelectOption, TextInput } from '@patternfly/react-core';
import React, { useEffect, useMemo } from 'react';

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
  const [isOpen, setIsOpen] = React.useState(false);

  // remove possible duplicates
  const options = useMemo(() => Array.from(new Set(identifierOptions)), [identifierOptions]);

  // auto-select if there is only one option
  useEffect(() => {
    if (options.length === 1) {
      onChange(options[0]);
    }
    // Do not include onChange callback as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  if (options.length > 1) {
    return (
      <Select
        id="accelerator-identifier-select"
        data-testid="accelerator-identifier-select"
        isOpen={isOpen}
        shouldFocusToggleOnSelect
        toggle={(toggleRef) => (
          <MenuToggle
            data-testid="accelerator-button"
            isFullWidth
            ref={toggleRef}
            onClick={() => setIsOpen(!isOpen)}
            isExpanded={isOpen}
          >
            {value || 'Select an identifier'}
          </MenuToggle>
        )}
        onSelect={(_, option) => {
          if (typeof option === 'string') {
            onChange(option);
            setIsOpen(false);
          }
        }}
        selected={value}
      >
        <SelectList>
          {options.map((option) => (
            <SelectOption key={option} value={option}>
              {option}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    );
  }

  return (
    <TextInput
      isRequired
      value={value}
      id="accelerator-identifier"
      name="accelerator-identifier"
      isDisabled={options.length === 1}
      onChange={(_, identifier) => onChange(identifier)}
      placeholder="Example, nvidia.com/gpu"
      aria-label="Identifier"
      data-testid="accelerator-identifier-input"
    />
  );
};
