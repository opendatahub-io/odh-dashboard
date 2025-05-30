import * as React from 'react';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import RoleBindingPermissions from '#~/concepts/roleBinding/RoleBindingPermissions';
import { RoleBindingPermissionsRoleType } from '#~/concepts/roleBinding/types';
import { createRoleBinding, deleteRoleBinding } from '#~/api';

const ProjectSharing: React.FC = () => {
  const {
    currentProject,
    projectSharingRB,
    groups: [groups],
  } = React.useContext(ProjectDetailsContext);

  return (
    <RoleBindingPermissions
      permissionOptions={[
        {
          type: RoleBindingPermissionsRoleType.EDIT,
          description: 'View and edit the project components',
        },
        {
          type: RoleBindingPermissionsRoleType.ADMIN,
          description: 'Edit the project and manage user access',
        },
      ]}
      roleRefKind="ClusterRole"
      projectName={currentProject.metadata.name}
      description="Add users and groups that can access the project."
      roleBindingPermissionsRB={projectSharingRB}
      groups={groups}
      createRoleBinding={createRoleBinding}
      deleteRoleBinding={deleteRoleBinding}
    />
  );
};

export default ProjectSharing;
