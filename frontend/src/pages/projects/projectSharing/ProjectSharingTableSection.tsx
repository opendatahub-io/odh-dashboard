import * as React from 'react';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { RoleBindingKind } from '~/k8sTypes';
import { generateRoleBindingProjectSharing } from '~/api';
import ProjectSharingTable from './ProjectSharingTable';
import { ProjectSharingRBType, ProjectSharingRoleType } from './types';

export type ProjectSharingTableSectionProps = {
  roleBindings: RoleBindingKind[];
  projectSharingTableType: ProjectSharingRBType;
  namespace: string;
  typeAhead?: string[];
  refresh: () => void;
};

const ProjectSharingTableSection: React.FC<ProjectSharingTableSectionProps> = ({
  roleBindings,
  projectSharingTableType,
  namespace,
  typeAhead,
  refresh,
}) => {
  const [addField, setAddField] = React.useState<RoleBindingKind | undefined>(undefined);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  const permissionLocal = React.useMemo(() => {
    if (addField) {
      return [...roleBindings, addField];
    }
    return roleBindings;
  }, [roleBindings, addField]);

  return (
    <Stack hasGutter>
      <StackItem>
        <Title id={`user-permission`} headingLevel="h2" size="xl">
          {projectSharingTableType === ProjectSharingRBType.USER ? 'Users' : 'Groups'}
        </Title>
      </StackItem>
      <StackItem>
        <ProjectSharingTable
          permissions={permissionLocal}
          type={projectSharingTableType}
          typeAhead={typeAhead}
          onCancel={() => {
            setAddField(undefined);
          }}
          onError={(error) => {
            setError(error);
          }}
          refresh={() => {
            setAddField(undefined);
            refresh();
          }}
        />
      </StackItem>
      {error && (
        <StackItem>
          <Alert
            isInline
            variant="danger"
            title="Error"
            actionClose={<AlertActionCloseButton onClose={() => setError(undefined)} />}
          >
            <p>{error.message}</p>
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <Button
          variant="link"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          onClick={() =>
            setAddField(
              generateRoleBindingProjectSharing(
                namespace,
                projectSharingTableType,
                '',
                ProjectSharingRoleType.EDIT,
              ),
            )
          }
          style={{ paddingLeft: 'var(--pf-global--spacer--lg)' }}
        >
          {projectSharingTableType === ProjectSharingRBType.USER ? 'Add user' : 'Add group'}
        </Button>
      </StackItem>
    </Stack>
  );
};

export default ProjectSharingTableSection;
