import React from 'react';
import SimpleSelect from '~/components/SimpleSelect';
import { ProjectSharingRoleType } from './types';
import { castProjectSharingRoleType, roleLabel } from './utils';

type ProjectSharingPermissionSelectionProps = {
  selection: ProjectSharingRoleType;
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
}) => (
  <SimpleSelect
    isFullWidth
    options={ProjectSharingPermissions.map((option) => ({
      key: option.type,
      children: roleLabel(option.type),
      description: option.description,
    }))}
    toggleLabel={roleLabel(selection)}
    selected={selection}
    onSelect={(e, newSelection) => {
      if (typeof newSelection === 'string') {
        onSelect(castProjectSharingRoleType(newSelection));
      }
    }}
    popperProps={{ direction: 'down' }}
  />
);

export default ProjectSharingPermissionSelection;
