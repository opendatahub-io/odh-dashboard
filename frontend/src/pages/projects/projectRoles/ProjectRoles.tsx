import * as React from 'react';
import { Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import useRoleListData from './useRoleListData';
import RolesTable from './RolesTable';

const ProjectRoles: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const { roles, clusterRoles, loaded, error } = usePermissionsContext();

  const [searchFilter, setSearchFilter] = React.useState('');

  const rows = useRoleListData(roles.data, clusterRoles.data, searchFilter);

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error) {
    throw error;
  }

  return (
    <PageSection hasBodyWrapper={false} data-testid="project-roles-tab">
      <RolesTable
        rows={rows}
        namespace={namespace}
        searchFilter={searchFilter}
        onSearchChange={setSearchFilter}
      />
    </PageSection>
  );
};

export default ProjectRoles;
