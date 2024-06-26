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
import { RoleBindingKind, RoleBindingSubject } from '~/k8sTypes';
import HeaderIcon from '~/concepts/design/HeaderIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import RoleBindingPermissionsTable from './RoleBindingPermissionsTable';
import { RoleBindingPermissionsRBType, RoleBindingPermissionsRoleType } from './types';

export type RoleBindingPermissionsTableSectionAltProps = {
  roleBindings: RoleBindingKind[];
  projectName: string;
  roleKind: RoleBindingSubject['kind'];
  roleRef?: string;
  roleBindingPermissionsTableType: RoleBindingPermissionsRBType;
  permissionOptions: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  typeAhead?: string[];
  refresh: () => void;
  typeModifier?: string;
  defaultRoleBindingName?: string;
  labels?: { [key: string]: string };
};

const RoleBindingPermissionsTableSection: React.FC<RoleBindingPermissionsTableSectionAltProps> = ({
  roleBindings,
  projectName,
  roleKind,
  roleRef,
  roleBindingPermissionsTableType,
  permissionOptions,
  typeAhead,
  refresh,
  typeModifier,
  defaultRoleBindingName,
  labels,
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
              roleBindingPermissionsTableType === RoleBindingPermissionsRBType.USER
                ? ProjectObjectType.user
                : ProjectObjectType.group
            }
          />
          <FlexItem>
            <Title
              id={`user-permission-${roleBindingPermissionsTableType}`}
              headingLevel="h2"
              size="xl"
            >
              {roleBindingPermissionsTableType === RoleBindingPermissionsRBType.USER
                ? 'Users'
                : 'Groups'}
            </Title>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <RoleBindingPermissionsTable
          defaultRoleBindingName={defaultRoleBindingName}
          permissions={roleBindings}
          permissionOptions={permissionOptions}
          projectName={projectName}
          roleKind={roleKind}
          roleRef={roleRef}
          labels={labels}
          type={roleBindingPermissionsTableType}
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
          data-testid={`add-button ${roleBindingPermissionsTableType}`}
          variant="link"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          onClick={() => setAddField(true)}
          style={{ paddingLeft: 'var(--pf-v5-global--spacer--lg)' }}
        >
          {roleBindingPermissionsTableType === RoleBindingPermissionsRBType.USER
            ? 'Add user'
            : 'Add group'}
        </Button>
      </StackItem>
    </Stack>
  );
};

export default RoleBindingPermissionsTableSection;
