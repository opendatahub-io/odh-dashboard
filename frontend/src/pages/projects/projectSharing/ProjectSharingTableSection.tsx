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
import ProjectSharingTable from './ProjectSharingTable';
import { ProjectSharingRBType } from './types';

export type ProjectSharingTableSectionProps = {
  roleBindings: RoleBindingKind[];
  projectSharingTableType: ProjectSharingRBType;
  typeAhead?: string[];
  refresh: () => void;
};

const ProjectSharingTableSection: React.FC<ProjectSharingTableSectionProps> = ({
  roleBindings,
  projectSharingTableType,
  typeAhead,
  refresh,
}) => {
  const [addField, setAddField] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  return (
    <Stack hasGutter>
      <StackItem>
        <Title id={`user-permission-${projectSharingTableType}`} headingLevel="h2" size="xl">
          {projectSharingTableType === ProjectSharingRBType.USER ? 'Users' : 'Groups'}
        </Title>
      </StackItem>
      <StackItem>
        <ProjectSharingTable
          permissions={roleBindings}
          type={projectSharingTableType}
          typeAhead={typeAhead}
          isAdding={addField}
          onDismissNewRow={() => {
            setAddField(false);
          }}
          onError={(error) => {
            setError(error);
          }}
          refresh={() => {
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
          onClick={() => setAddField(true)}
          style={{ paddingLeft: 'var(--pf-v5-global--spacer--lg)' }}
        >
          {projectSharingTableType === ProjectSharingRBType.USER ? 'Add user' : 'Add group'}
        </Button>
      </StackItem>
    </Stack>
  );
};

export default ProjectSharingTableSection;
