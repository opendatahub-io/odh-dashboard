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
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { RoleBindingKind, RoleBindingRoleRef, RoleBindingSubject } from '~/k8sTypes';
import HeaderIcon from '~/concepts/design/HeaderIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import RoleBindingPermissionsTable from './RoleBindingPermissionsTable';
import { RoleBindingPermissionsRBType, RoleBindingPermissionsRoleType } from './types';

export type RoleBindingPermissionsTableSectionAltProps = {
  ownerReference?: K8sResourceCommon;
  roleBindings: RoleBindingKind[];
  projectName: string;
  roleRefKind: RoleBindingRoleRef['kind'];
  roleRefName?: RoleBindingRoleRef['name'];
  subjectKind: RoleBindingSubject['kind'];
  permissionOptions: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  typeAhead?: string[];
  refresh: () => void;
  typeModifier: string;
  defaultRoleBindingName?: string;
  labels?: { [key: string]: string };
  isProjectSubject?: boolean;
};

const RoleBindingPermissionsTableSection: React.FC<RoleBindingPermissionsTableSectionAltProps> = ({
  ownerReference,
  roleBindings,
  projectName,
  roleRefKind,
  roleRefName,
  subjectKind,
  permissionOptions,
  typeAhead,
  refresh,
  typeModifier,
  defaultRoleBindingName,
  labels,
  isProjectSubject,
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
              isProjectSubject
                ? ProjectObjectType.project
                : subjectKind === RoleBindingPermissionsRBType.USER
                ? ProjectObjectType.user
                : ProjectObjectType.group
            }
          />
          <FlexItem>
            <Title id={`user-permission-${typeModifier}`} headingLevel="h2" size="xl">
              {isProjectSubject
                ? 'Projects'
                : subjectKind === RoleBindingPermissionsRBType.USER
                ? 'Users'
                : 'Groups'}
            </Title>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <RoleBindingPermissionsTable
          ownerReference={ownerReference}
          defaultRoleBindingName={defaultRoleBindingName}
          permissions={roleBindings}
          permissionOptions={permissionOptions}
          namespace={projectName}
          roleRefKind={roleRefKind}
          roleRefName={roleRefName}
          isProjectSubject={isProjectSubject}
          labels={labels}
          subjectKind={subjectKind}
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
          data-testid={`add-button ${typeModifier}`}
          variant="link"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          onClick={() => setAddField(true)}
          style={{ paddingLeft: 'var(--pf-v5-global--spacer--lg)' }}
        >
          {isProjectSubject
            ? 'Add project'
            : subjectKind === RoleBindingPermissionsRBType.USER
            ? 'Add user'
            : 'Add group'}
        </Button>
      </StackItem>
    </Stack>
  );
};

export default RoleBindingPermissionsTableSection;
