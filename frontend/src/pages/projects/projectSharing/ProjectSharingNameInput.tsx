import React from 'react';
import { TextInput } from '@patternfly/react-core';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core/deprecated';
import { ProjectSharingRBType } from '~/pages/projects/projectSharing/types';

type ProjectSharingNameInputProps = {
  type: ProjectSharingRBType;
  value: string;
  onChange: (selection: string) => void;
  onClear: () => void;
  placeholderText: string;
  typeAhead?: string[];
};

const ProjectSharingNameInput: React.FC<ProjectSharingNameInputProps> = ({
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
        isRequired
        aria-label="project-sharing-name-input"
        type="text"
        value={value}
        placeholder={`Type ${type === ProjectSharingRBType.GROUP ? 'group name' : 'username'}`}
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
      isCreatable={true}
      aria-labelledby="name-selection"
      placeholderText={placeholderText}
    >
      {typeAhead.map((option, index) => (
        <SelectOption key={index} value={option} />
      ))}
    </Select>
  );
};

export default ProjectSharingNameInput;
