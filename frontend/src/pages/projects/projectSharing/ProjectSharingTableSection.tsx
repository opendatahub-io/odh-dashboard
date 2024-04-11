import * as React from 'react';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { RoleBindingKind } from '~/k8sTypes';
import HeaderIcon from '~/concepts/design/HeaderIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import ProjectSharingTable from './ProjectSharingTable';
import { ProjectSharingRBType } from './types';

export type ProjectSharingTableSectionAltProps = {
  roleBindings: RoleBindingKind[];
  projectSharingTableType: ProjectSharingRBType;
  typeAhead?: string[];
  refresh: () => void;
  typeModifier?: string;
};

const ProjectSharingTableSection: React.FC<ProjectSharingTableSectionAltProps> = ({
  roleBindings,
  projectSharingTableType,
  typeAhead,
  refresh,
  typeModifier,
}) => {
  const [addField, setAddField] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  return (
    <Stack hasGutter>
      <StackItem>
        <Flex
          direction={{ default: 'row' }}
          gap={{ default: 'gapSm' }}
          alignItems={{ default: 'alignItemsCenter' }}
          className={typeModifier}
        >
          <HeaderIcon
            type={
              projectSharingTableType === ProjectSharingRBType.USER
                ? ProjectObjectType.user
                : ProjectObjectType.group
            }
          />
          <FlexItem>
            <Title id={`user-permission-${projectSharingTableType}`} headingLevel="h2" size="xl">
              {projectSharingTableType === ProjectSharingRBType.USER ? 'Users' : 'Groups'}
            </Title>
          </FlexItem>
        </Flex>
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
          onError={(e) => {
            setError(e);
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
          data-testid={`add-button ${projectSharingTableType}`}
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
