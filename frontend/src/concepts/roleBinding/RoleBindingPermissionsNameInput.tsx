import React from 'react';
import { TextInput } from '@patternfly/react-core';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core/deprecated';
import { RoleBindingSubject } from '~/k8sTypes';
import { namespaceToProjectDisplayName } from '~/concepts/projects/utils';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { RoleBindingPermissionsRBType } from './types';

type RoleBindingPermissionsNameInputProps = {
  subjectKind: RoleBindingSubject['kind'];
  value: string;
  onChange: (selection: string) => void;
  onClear: () => void;
  placeholderText: string;
  typeAhead?: string[];
  isProjectSubject?: boolean;
};

const RoleBindingPermissionsNameInput: React.FC<RoleBindingPermissionsNameInputProps> = ({
  subjectKind,
  value,
  onChange,
  onClear,
  placeholderText,
  typeAhead,
  isProjectSubject,
}) => {
  const { projects } = React.useContext(ProjectsContext);
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
          isProjectSubject
            ? 'project name'
            : subjectKind === RoleBindingPermissionsRBType.GROUP
            ? 'group name'
            : 'username'
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
        <SelectOption
          key={index}
          value={isProjectSubject ? namespaceToProjectDisplayName(option, projects) : option}
        />
      ))}
    </Select>
  );
};

export default RoleBindingPermissionsNameInput;
