import * as React from 'react';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  Button,
  Popover,
  Split,
  SplitItem,
  Content,
  Timestamp,
  TimestampTooltipVariant,
  Tooltip,
  Truncate,
} from '@patternfly/react-core';
import {
  CheckIcon,
  OutlinedQuestionCircleIcon,
  TimesIcon,
  EllipsisVIcon,
} from '@patternfly/react-icons';
import { ProjectKind, RoleBindingKind, RoleBindingSubject } from '~/k8sTypes';
import { relativeTime } from '~/utilities/time';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { projectDisplayNameToNamespace } from '~/concepts/projects/utils';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { castRoleBindingPermissionsRoleType, firstSubject, roleLabel } from './utils';
import { RoleBindingPermissionsRoleType } from './types';
import RoleBindingPermissionsNameInput from './RoleBindingPermissionsNameInput';
import RoleBindingPermissionsPermissionSelection from './RoleBindingPermissionsPermissionSelection';

type RoleBindingPermissionsTableRowProps = {
  roleBindingObject?: RoleBindingKind;
  subjectKind: RoleBindingSubject['kind'];
  isEditing: boolean;
  isAdding: boolean;
  defaultRoleBindingName?: string;
  permissionOptions: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  typeAhead?: string[];
  isProjectSubject?: boolean;
  onChange: (name: string, roleType: RoleBindingPermissionsRoleType) => void;
  onCancel: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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
  isAdding,
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
  const [roleBindingName, setRoleBindingName] = React.useState(() => {
    if (isAdding || !obj) {
      return '';
    }
    return defaultValueName(obj, isProjectSubject, projects);
  });
  const [roleBindingRoleRef, setRoleBindingRoleRef] =
    React.useState<RoleBindingPermissionsRoleType>(() => {
      if (isAdding || !obj) {
        return permissionOptions[0]?.type;
      }
      return defaultValueRole(obj);
    });
  const [isLoading, setIsLoading] = React.useState(false);
  const createdDate = new Date(obj?.metadata.creationTimestamp ?? '');
  const isDefaultGroup = obj?.metadata.name === defaultRoleBindingName;

  //Sync local state with props if exiting edit mode
  React.useEffect(() => {
    if (!isEditing && obj) {
      setRoleBindingName(
        isProjectSubject
          ? defaultValueName(obj, isProjectSubject, projects)
          : defaultValueName(obj),
      );
      setRoleBindingRoleRef(defaultValueRole(obj));
    }
  }, [obj, isEditing, isProjectSubject, projects]);

  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Username">
          {isEditing || isAdding ? (
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
          ) : (
            <Content component="p">
              <Truncate content={roleBindingName} />
              {` `}
              {isDefaultGroup && (
                <Popover
                  bodyContent={
                    <div>
                      This group is created by default. You can add users to this group in OpenShift
                      user management, or ask the cluster admin to do so.
                    </div>
                  }
                >
                  <DashboardPopupIconButton
                    icon={<OutlinedQuestionCircleIcon />}
                    aria-label="More info"
                  />
                </Popover>
              )}
            </Content>
          )}
        </Td>
        <Td dataLabel="Permission">
          {(isEditing || isAdding) && permissionOptions.length > 1 ? (
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
        <Td dataLabel="Date added">
          {!isEditing && !isAdding && (
            <Content component="p">
              <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
                {relativeTime(Date.now(), createdDate.getTime())}
              </Timestamp>
            </Content>
          )}
        </Td>
        <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
          {isEditing || isAdding ? (
            <Split>
              <SplitItem>
                <Button
                  data-testid={isAdding ? `save-new-button` : `save-button ${roleBindingName}`}
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
                    setIsLoading(false);
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
          ) : isDefaultGroup ? (
            <Tooltip content="The default group cannot be edited or deleted. The group’s members can be managed via the API.">
              <Button
                icon={<EllipsisVIcon />}
                variant="plain"
                isAriaDisabled
                aria-label="The default group always has access to model registry."
              />
            </Tooltip>
          ) : (
            <ActionsColumn
              items={[
                {
                  title: 'Edit',
                  onClick: () => {
                    onEdit?.();
                  },
                },
                { isSeparator: true },
                {
                  title: 'Delete',
                  onClick: () => {
                    onDelete?.();
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
