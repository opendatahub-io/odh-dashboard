import React from 'react';
import { TextInput } from '@patternfly/react-core';
import { RoleBindingSubject } from '~/k8sTypes';
import { namespaceToProjectDisplayName } from '~/concepts/projects/utils';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import TypeaheadSelect from '~/components/TypeaheadSelect';
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

  const selectOptions = typeAhead.map((option) => {
    const displayName = isProjectSubject ? namespaceToProjectDisplayName(option, projects) : option;
    return { value: displayName, content: displayName };
  });
  // If we've selected an option that doesn't exist via isCreatable, include it in the options so it remains selected
  if (value && !selectOptions.some((option) => option.value === value)) {
    selectOptions.push({ value, content: value });
  }
  return (
    <TypeaheadSelect
      isScrollable
      selectOptions={selectOptions}
      selected={value}
      isCreatable
      onClearSelection={onClear}
      onSelect={(_ev, selectedValue) => {
        if (typeof selectedValue === 'string') {
          onChange(selectedValue);
        }
      }}
      placeholder={placeholderText}
      createOptionMessage={(newValue) => `Select "${newValue}"`}
    />
  );
};

export default RoleBindingPermissionsNameInput;
