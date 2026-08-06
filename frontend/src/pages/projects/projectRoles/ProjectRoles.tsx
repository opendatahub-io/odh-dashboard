import * as React from 'react';
import {
  Bullseye,
  Content,
  ContentVariants,
  Flex,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
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
      <Flex direction={{ default: 'column' }}>
        <Title headingLevel="h3" data-testid="roles-tab-title">
          Roles
        </Title>
        <Content component={ContentVariants.p} data-testid="roles-tab-description">
          Create and manage roles for this project. Roles define what actions users can perform on
          project resources. To assign roles to users or groups, go to the{' '}
          <Link
            data-testid="roles-tab-permissions-link"
            to={`/projects/${currentProject.metadata.name}?section=permissions`}
          >
            <strong>Permissions</strong> tab
          </Link>
          .
        </Content>
      </Flex>
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
