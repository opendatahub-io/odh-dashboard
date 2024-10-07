import * as React from 'react';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import { Button, Split, SplitItem, Content } from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { RoleBindingSubject } from '~/k8sTypes';
import { projectDisplayNameToNamespace } from '~/concepts/projects/utils';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { RoleBindingPermissionsRoleType } from './types';
import RoleBindingPermissionsNameInput from './RoleBindingPermissionsNameInput';
import RoleBindingPermissionsPermissionSelection from './RoleBindingPermissionsPermissionSelection';
import { roleLabel } from './utils';

type RoleBindingPermissionsTableRowPropsAdd = {
  typeAhead?: string[];
  subjectKind: RoleBindingSubject['kind'];
  isProjectSubject?: boolean;
  permissionOptions: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  onChange: (name: string, roleType: RoleBindingPermissionsRoleType) => void;
  onCancel: () => void;
};

/** @deprecated - this should use RoleBindingPermissionsTableRow */
const RoleBindingPermissionsTableRowAdd: React.FC<RoleBindingPermissionsTableRowPropsAdd> = ({
  typeAhead,
  subjectKind,
  permissionOptions,
  isProjectSubject,
  onChange,
  onCancel,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const [roleBindingName, setRoleBindingName] = React.useState('');
  const [roleBindingRoleRef, setRoleBindingRoleRef] =
    React.useState<RoleBindingPermissionsRoleType>(permissionOptions[0]?.type);
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Username">
          <RoleBindingPermissionsNameInput
            subjectKind={subjectKind}
            value={roleBindingName}
            onChange={(selection: React.SetStateAction<string>) => {
              setRoleBindingName(selection);
            }}
            onClear={() => setRoleBindingName('')}
            placeholderText={isProjectSubject ? 'Select or enter a project' : 'Select a group'}
            typeAhead={typeAhead}
            isProjectSubject={isProjectSubject}
          />
        </Td>
        <Td dataLabel="Permission">
          {permissionOptions.length > 1 ? (
            <RoleBindingPermissionsPermissionSelection
              permissionOptions={permissionOptions}
              selection={roleBindingRoleRef}
              onSelect={(selection) => {
                setRoleBindingRoleRef(selection);
              }}
            />
          ) : (
            <Content component="p">{roleLabel(roleBindingRoleRef)}</Content>
          )}
        </Td>
        <Td dataLabel="Date added" />
        <Td isActionCell modifier="nowrap">
          <Split>
            <SplitItem>
              <Button
                data-testid="save-new-button"
                data-id="save-rolebinding-button"
                aria-label="Save role binding"
                variant="link"
                icon={<CheckIcon />}
                isDisabled={isLoading || !roleBindingName || !roleBindingRoleRef}
                onClick={() => {
                  setIsLoading(true);
                  onChange(
                    isProjectSubject
                      ? `system:serviceaccounts:${projectDisplayNameToNamespace(
                          roleBindingName,
                          projects,
                        )}`
                      : roleBindingName,
                    roleBindingRoleRef,
                  );
                }}
              />
            </SplitItem>
            <SplitItem>
              <Button
                data-id="cancel-rolebinding-button"
                aria-label="Cancel role binding"
                variant="plain"
                isDisabled={isLoading}
                icon={<TimesIcon />}
                onClick={() => {
                  onCancel();
                }}
              />
            </SplitItem>
          </Split>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default RoleBindingPermissionsTableRowAdd;
