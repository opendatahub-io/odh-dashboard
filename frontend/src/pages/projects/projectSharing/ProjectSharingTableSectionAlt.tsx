import * as React from 'react';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  Alert,
  AlertActionCloseButton,
  Badge,
  Button,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { RoleBindingKind } from '~/k8sTypes';
import userCardImage from '~/images/UI_icon-Red_Hat-User-RGB.svg';
import groupCardImage from '~/images/UI_icon-Red_Hat-Shared_workspace-RGB.svg';
import ProjectSharingTable from './ProjectSharingTable';
import { ProjectSharingRBType } from './types';

import './ProjectSharingTableSection.scss';

export type ProjectSharingTableSectionAltProps = {
  roleBindings: RoleBindingKind[];
  projectSharingTableType: ProjectSharingRBType;
  typeAhead?: string[];
  refresh: () => void;
  typeModifier?: string;
};

const ProjectSharingTableSectionAlt: React.FC<ProjectSharingTableSectionAltProps> = ({
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
          <div className="odh-project-sharing__header--icon">
            <img
              src={
                projectSharingTableType === ProjectSharingRBType.USER
                  ? userCardImage
                  : groupCardImage
              }
              alt={projectSharingTableType === ProjectSharingRBType.USER ? 'Users' : 'Groups'}
            />
          </div>
          <FlexItem>
            <Title id={`user-permission-${projectSharingTableType}`} headingLevel="h2" size="xl">
              {projectSharingTableType === ProjectSharingRBType.USER ? 'Users' : 'Groups'}
            </Title>
          </FlexItem>
          <FlexItem>
            <Badge className="odh-project-sharing__badge">{roleBindings.length}</Badge>
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

export default ProjectSharingTableSectionAlt;
