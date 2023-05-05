import { Select, SelectOption, SelectVariant, TextInput } from '@patternfly/react-core';
import React from 'react';
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
        onChange={onChange}
      />
    );
  }

  return (
    <Select
      removeFindDomNode
      variant={SelectVariant.typeahead}
      typeAheadAriaLabel="Name selection"
      selections={value}
      onToggle={(isOpened) => {
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
