import * as React from 'react';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import RoleBindingPermissions from '~/concepts/roleBinding/RoleBindingPermissions';

const ProjectSharing: React.FC = () => {
  const {
    currentProject,
    projectSharingRB,
    groups: [groups],
  } = React.useContext(ProjectDetailsContext);

  return (
    <RoleBindingPermissions
      projectName={currentProject.metadata.name}
      description="Add users and groups that can access the project."
      roleBindingPermissionsRB={projectSharingRB}
      groups={groups}
    />
  );
};

export default ProjectSharing;
