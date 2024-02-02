import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import React from 'react';
import { ProjectSharingRoleType } from './types';
import { castProjectSharingRoleType, roleLabel } from './utils';

type ProjectSharingPermissionSelectionProps = {
  selection: string;
  onSelect: (roleType: ProjectSharingRoleType) => void;
};

const ProjectSharingPermissions = [
  {
    type: ProjectSharingRoleType.EDIT,
    description: 'View and edit the project components',
  },
  {
    type: ProjectSharingRoleType.ADMIN,
    description: 'Edit the project and manage user access',
  },
];

const ProjectSharingPermissionSelection: React.FC<ProjectSharingPermissionSelectionProps> = ({
  selection,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Select
      selections={selection}
      isOpen={isOpen}
      onSelect={(e, selection) => {
        if (typeof selection === 'string') {
          onSelect(castProjectSharingRoleType(selection));
          setIsOpen(false);
        }
      }}
      onToggle={(e, val) => setIsOpen(val)}
      placeholderText={selection}
      direction="down"
    >
      {ProjectSharingPermissions.map((option) => (
        <SelectOption key={option.type} value={option.type} description={option.description}>
          {roleLabel(option.type)}
        </SelectOption>
      ))}
    </Select>
  );
};

export default ProjectSharingPermissionSelection;
