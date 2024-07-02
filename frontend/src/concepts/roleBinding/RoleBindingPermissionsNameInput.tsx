import React from 'react';
import { TextInput } from '@patternfly/react-core';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core/deprecated';
import { RoleBindingPermissionsRBType } from './types';

type RoleBindingPermissionsNameInputProps = {
  type: RoleBindingPermissionsRBType;
  value: string;
  onChange: (selection: string) => void;
  onClear: () => void;
  placeholderText: string;
  typeAhead?: string[];
};

const RoleBindingPermissionsNameInput: React.FC<RoleBindingPermissionsNameInputProps> = ({
  type,
  value,
  onChange,
  onClear,
  placeholderText,
  typeAhead,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!typeAhead) {
    return (
      <TextInput
        data-testid={`role-binding-name-input ${value}`}
        isRequired
        aria-label="role-binding-name-input"
        type="text"
        value={value}
        placeholder={`Type ${
          type === RoleBindingPermissionsRBType.GROUP ? 'group name' : 'username'
        }`}
        onChange={(e, newValue) => onChange(newValue)}
      />
    );
  }

  return (
    <Select
      variant={SelectVariant.typeahead}
      typeAheadAriaLabel="Name selection"
      selections={value}
      onToggle={(e, isOpened) => {
        setIsOpen(isOpened);
      }}
      onSelect={(e, selection) => {
        if (typeof selection === 'string') {
          onChange(selection);
          setIsOpen(false);
        }
      }}
      onClear={onClear}
      isOpen={isOpen}
      isCreatable
      aria-labelledby="name-selection"
      placeholderText={placeholderText}
    >
      {typeAhead.map((option, index) => (
        <SelectOption key={index} value={option} />
      ))}
    </Select>
  );
};

export default RoleBindingPermissionsNameInput;
