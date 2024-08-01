import * as React from 'react';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  Button,
  Icon,
  Split,
  SplitItem,
  Text,
  Timestamp,
  TimestampTooltipVariant,
  Tooltip,
} from '@patternfly/react-core';
import { CheckIcon, OutlinedQuestionCircleIcon, TimesIcon } from '@patternfly/react-icons';
import { ProjectKind, RoleBindingKind, RoleBindingSubject } from '~/k8sTypes';
import { relativeTime } from '~/utilities/time';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { projectDisplayNameToNamespace } from '~/concepts/projects/utils';
import { castRoleBindingPermissionsRoleType, firstSubject, roleLabel } from './utils';
import { RoleBindingPermissionsRoleType } from './types';
import RoleBindingPermissionsNameInput from './RoleBindingPermissionsNameInput';
import RoleBindingPermissionsPermissionSelection from './RoleBindingPermissionsPermissionSelection';

type RoleBindingPermissionsTableRowProps = {
  roleBindingObject: RoleBindingKind;
  subjectKind: RoleBindingSubject['kind'];
  isEditing: boolean;
  defaultRoleBindingName?: string;
  permissionOptions: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  typeAhead?: string[];
  isProjectSubject?: boolean;
  onChange: (name: string, roleType: RoleBindingPermissionsRoleType) => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const defaultValueName = (
  obj: RoleBindingKind,
  isProjectSubject?: boolean,
  projects?: ProjectKind[],
) => firstSubject(obj, isProjectSubject, projects);
const defaultValueRole = (obj: RoleBindingKind) =>
  castRoleBindingPermissionsRoleType(obj.roleRef.name);

const RoleBindingPermissionsTableRow: React.FC<RoleBindingPermissionsTableRowProps> = ({
  roleBindingObject: obj,
  subjectKind,
  isEditing,
  defaultRoleBindingName,
  permissionOptions,
  typeAhead,
  isProjectSubject,
  onChange,
  onCancel,
  onEdit,
  onDelete,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const [roleBindingName, setRoleBindingName] = React.useState(
    defaultValueName(obj, isProjectSubject, projects),
  );
  const [roleBindingRoleRef, setRoleBindingRoleRef] =
    React.useState<RoleBindingPermissionsRoleType>(defaultValueRole(obj));
  const [isLoading, setIsLoading] = React.useState(false);
  const createdDate = new Date(obj.metadata.creationTimestamp || '');
  const isDefaultGroup = obj.metadata.name === defaultRoleBindingName;

  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Username">
          {isEditing ? (
            <RoleBindingPermissionsNameInput
              subjectKind={subjectKind}
              value={roleBindingName}
              onChange={(selection) => {
                setRoleBindingName(selection);
              }}
              onClear={() => setRoleBindingName('')}
              placeholderText={isProjectSubject ? 'Select or enter a project' : 'Select a group'}
              typeAhead={typeAhead}
              isProjectSubject={isProjectSubject}
            />
          ) : (
            <Text>
              {roleBindingName}
              {` `}
              {isDefaultGroup && (
                <Tooltip
                  content={
                    <div>
                      This group is created by default. You can add users to this group via the API.
                    </div>
                  }
                >
                  <Icon>
                    <OutlinedQuestionCircleIcon />
                  </Icon>
                </Tooltip>
              )}
            </Text>
          )}
        </Td>
        <Td dataLabel="Permission">
          {isEditing && permissionOptions.length > 1 ? (
            <RoleBindingPermissionsPermissionSelection
              permissionOptions={permissionOptions}
              selection={roleBindingRoleRef}
              onSelect={(selection) => {
                setRoleBindingRoleRef(selection);
              }}
            />
          ) : (
            <Text>{roleLabel(roleBindingRoleRef)}</Text>
          )}
        </Td>
        <Td dataLabel="Date added">
          {!isEditing && (
            <Text>
              <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
                {relativeTime(Date.now(), createdDate.getTime())}
              </Timestamp>
            </Text>
          )}
        </Td>
        <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
          {isEditing ? (
            <Split>
              <SplitItem>
                <Button
                  data-testid={`save-button ${roleBindingName}`}
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
                    // TODO: Fix this
                    // This is why you do not store a copy of state
                    setRoleBindingName(
                      isProjectSubject
                        ? defaultValueName(obj, isProjectSubject, projects)
                        : defaultValueName(obj),
                    );
                    setRoleBindingRoleRef(defaultValueRole(obj));
                    onCancel();
                  }}
                />
              </SplitItem>
            </Split>
          ) : (
            <ActionsColumn
              isDisabled={isDefaultGroup}
              items={[
                {
                  title: 'Edit',
                  onClick: () => {
                    onEdit();
                  },
                },
                {
                  title: 'Delete',
                  onClick: () => {
                    onDelete();
                  },
                },
              ]}
            />
          )}
        </Td>
      </Tr>
    </Tbody>
  );
};

export default RoleBindingPermissionsTableRow;
