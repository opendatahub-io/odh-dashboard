import * as React from 'react';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Button, Stack, StackItem, Title } from '@patternfly/react-core';
import { RoleBindingKind } from '~/k8sTypes';
import { generateRoleBindingProjectSharing } from '~/api';
import ProjectSharingTable from './ProjectSharingTable';
import { ProjectSharingRBType, ProjectSharingRoleType } from './types';
import { filterRoleBindingSubjects } from './utils';

export type ProjectSharingTableSectionProps = {
  roleBindings: RoleBindingKind[];
  projectSharingTableType: ProjectSharingRBType;
  namespace: string;
  refresh: () => void;
};

const ProjectSharingTableSection: React.FC<ProjectSharingTableSectionProps> = ({
  roleBindings,
  projectSharingTableType,
  namespace,
  refresh,
}) => {
  const [permissionLocal, setPermissionLocal] = React.useState(
    filterRoleBindingSubjects(roleBindings, projectSharingTableType),
  );
  const [addField, setAddField] = React.useState(false);

  const hasAddingField =
    permissionLocal.filter((rolebinding) => rolebinding.subjects[0]?.name === '').length > 0;

  React.useEffect(() => {
    const permissions = filterRoleBindingSubjects(roleBindings, projectSharingTableType);

    if (!hasAddingField || !addField) {
      setPermissionLocal(filterRoleBindingSubjects(roleBindings, projectSharingTableType));
    }

    if (!hasAddingField && addField) {
      setPermissionLocal([
        ...permissions,
        generateRoleBindingProjectSharing(
          namespace,
          projectSharingTableType,
          '',
          ProjectSharingRoleType.EDIT,
        ),
      ]);
    }
  }, [roleBindings, addField, namespace, projectSharingTableType, hasAddingField]);

  return (
    <Stack hasGutter>
      <StackItem>
        <Title id={`user-permission`} headingLevel="h2" size="xl">
          {projectSharingTableType === ProjectSharingRBType.USER ? 'Users' : 'Groups'}
        </Title>
      </StackItem>
      <StackItem>
        {' '}
        <ProjectSharingTable
          permissions={permissionLocal}
          type={projectSharingTableType}
          onCancel={() => {
            setAddField(false);
            setPermissionLocal(filterRoleBindingSubjects(roleBindings, projectSharingTableType));
          }}
          refresh={() => {
            setAddField(false);
            refresh();
          }}
        />
      </StackItem>
      <StackItem>
        <Button
          variant="link"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          onClick={() => setAddField(true)}
          style={{ paddingLeft: 'var(--pf-global--spacer--lg)' }}
        >
          {projectSharingTableType === ProjectSharingRBType.USER ? 'Add user' : 'Add group'}
        </Button>
      </StackItem>
    </Stack>
  );
};

export default ProjectSharingTableSection;
