import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Flex,
  FlexItem,
  PageSection,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { Table } from '@patternfly/react-table';
import { SortableData } from '~/utilities/useTableColumnSort';
import ProjectSharingTable from './ProjectSharingTable';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { RoleBindingKind } from '~/k8sTypes';

const ProjectSharing: React.FC = () => {
  const {
    currentProject,
    projectSharingRB: { data: roleBindings, loaded, error: loadError, refresh: refreshRB },
    refreshAllProjectData: refresh,
  } = React.useContext(ProjectDetailsContext);

  React.useEffect(() => {
    console.log(roleBindings);
  }, [roleBindings]);

  return (
    <PageSection
      isFilled
      aria-label="project-sharing-page-section"
      variant="light"
    >
          <Stack hasGutter>
      <StackItem>
        Add users and groups that can access the project. Edit allows users to view and make changes
        to the project. Admin allows users to also add and remove new users to the project
      </StackItem>
      <StackItem>
        <Stack hasGutter>
          <StackItem>
            <Title id={`user-permission`} headingLevel="h4" size="xl">
              Users
            </Title>
          </StackItem>
          <StackItem>
            {' '}
            <ProjectSharingTable permissions={roleBindings} refresh={() => {}} />
          </StackItem>
        </Stack>
      </StackItem>
    </Stack>
    </PageSection>

  );
};

export default ProjectSharing;
