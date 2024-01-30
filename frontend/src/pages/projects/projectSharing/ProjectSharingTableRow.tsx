import * as React from 'react';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  Button,
  Split,
  SplitItem,
  Text,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { RoleBindingKind } from '~/k8sTypes';
import { relativeTime } from '~/utilities/time';
import { castProjectSharingRoleType, firstSubject, roleLabel } from './utils';
import { ProjectSharingRBType, ProjectSharingRoleType } from './types';
import ProjectSharingNameInput from './ProjectSharingNameInput';
import ProjectSharingPermissionSelection from './ProjectSharingPermissionSelection';

type ProjectSharingTableRowProps = {
  obj: RoleBindingKind;
  type: ProjectSharingRBType;
  isEditing: boolean;
  typeAhead?: string[];
  onChange: (name: string, roleType: ProjectSharingRoleType) => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const defaultValueName = (obj: RoleBindingKind) => firstSubject(obj);
const defaultValueRole = (obj: RoleBindingKind) => castProjectSharingRoleType(obj.roleRef.name);

const ProjectSharingTableRow: React.FC<ProjectSharingTableRowProps> = ({
  obj,
  type,
  isEditing,
  typeAhead,
  onChange,
  onCancel,
  onEdit,
  onDelete,
}) => {
  const [roleBindingName, setRoleBindingName] = React.useState(defaultValueName(obj));
  const [roleBindingRoleRef, setRoleBindingRoleRef] = React.useState<ProjectSharingRoleType>(
    defaultValueRole(obj),
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const createdDate = new Date(obj.metadata.creationTimestamp || '');

  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Username">
          {isEditing ? (
            <ProjectSharingNameInput
              type={type}
              value={roleBindingName}
              onChange={(selection) => {
                setRoleBindingName(selection);
              }}
              onClear={() => setRoleBindingName('')}
              placeholderText={roleBindingName}
              typeAhead={typeAhead}
            />
          ) : (
            <Text>{roleBindingName}</Text>
          )}
        </Td>
        <Td dataLabel="Permission">
          {isEditing ? (
            <ProjectSharingPermissionSelection
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
                  data-id="save-rolebinding-button"
                  aria-label="Save role binding"
                  variant="link"
                  icon={<CheckIcon />}
                  isDisabled={isLoading || !roleBindingName || !roleBindingRoleRef}
                  onClick={() => {
                    setIsLoading(true);
                    onChange(roleBindingName, roleBindingRoleRef);
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
                    setRoleBindingName(defaultValueName(obj));
                    setRoleBindingRoleRef(defaultValueRole(obj));
                    onCancel();
                  }}
                />
              </SplitItem>
            </Split>
          ) : (
            <ActionsColumn
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

export default ProjectSharingTableRow;
