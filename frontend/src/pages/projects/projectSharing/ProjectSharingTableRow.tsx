import * as React from 'react';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  Button,
  DropdownDirection,
  Select,
  SelectOption,
  Text,
  TextInput,
} from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { RoleBindingKind } from '~/k8sTypes';
import { castProjectSharingRoleType, formatDate } from './utils';
import { ProjectSharingRoleType } from './types';

type ProjectSharingTableRowProps = {
  obj: RoleBindingKind;
  isEditing: boolean;
  onCreateRoleBinding: (name: string, roleType: ProjectSharingRoleType) => void;
  onCancelRoleBindingCreation: () => void;
  onDeleteRoleBinding: (rolebinding: RoleBindingKind) => void;
};

const ProjectSharingTableRow: React.FC<ProjectSharingTableRowProps> = ({
  obj,
  isEditing,
  onCreateRoleBinding,
  onCancelRoleBindingCreation,
  onDeleteRoleBinding,
}) => {
  const [roleBindingName, setRoleBindingName] = React.useState(obj.subjects[0]?.name || '');
  const [roleBindingRoleRef, setRoleBindingRoleRef] = React.useState<ProjectSharingRoleType>(
    castProjectSharingRoleType(obj.roleRef.name) || ProjectSharingRoleType.EDIT,
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Username">
          {isEditing ? (
            <TextInput
              isRequired
              id="serving-runtime-rolebinding-name"
              value={roleBindingName}
              onChange={(name) => setRoleBindingName(name)}
            />
          ) : (
            <Text>{roleBindingName}</Text>
          )}
        </Td>
        <Td dataLabel="Permission">
          {isEditing ? (
            <Select
              removeFindDomNode
              selections={roleBindingRoleRef}
              isOpen={isOpen}
              onSelect={(e, selection) => {
                if (typeof selection === 'string') {
                  setRoleBindingRoleRef(
                    castProjectSharingRoleType(selection) || ProjectSharingRoleType.EDIT,
                  );
                  setIsOpen(false);
                }
              }}
              onToggle={setIsOpen}
              placeholderText={roleBindingRoleRef}
              direction="down"
            >
              <SelectOption key={ProjectSharingRoleType.EDIT} value={ProjectSharingRoleType.EDIT}>
                {ProjectSharingRoleType.EDIT}
              </SelectOption>
              <SelectOption key={ProjectSharingRoleType.ADMIN} value={ProjectSharingRoleType.ADMIN}>
                {ProjectSharingRoleType.ADMIN}
              </SelectOption>
            </Select>
          ) : (
            <Text> {roleBindingRoleRef}</Text>
          )}
        </Td>
        <Td dataLabel="Date added">
          {!isEditing && obj && (
            <Text>
              {obj.metadata?.creationTimestamp ? formatDate(obj.metadata?.creationTimestamp) : ''}
            </Text>
          )}
        </Td>
        {!isEditing && obj && (
          <Td isActionCell>
            <ActionsColumn
              dropdownDirection={DropdownDirection.up}
              items={[
                {
                  title: 'Delete',
                  onClick: () => {
                    onDeleteRoleBinding(obj);
                  },
                },
              ]}
            />
          </Td>
        )}
        {isEditing && (
          <Td isActionCell modifier="nowrap">
            <Button
              data-id="save-rolebinding-button"
              variant="plain"
              icon={<CheckIcon />}
              isDisabled={isLoading}
              onClick={() => {
                setIsLoading(true);
                onCreateRoleBinding(roleBindingName, roleBindingRoleRef);
              }}
            />
            <Button
              data-id="cancel-rolebinding-button"
              variant="plain"
              isDisabled={isLoading}
              icon={<TimesIcon />}
              onClick={() => {
                onCancelRoleBindingCreation();
              }}
            />
          </Td>
        )}
      </Tr>
    </Tbody>
  );
};

export default ProjectSharingTableRow;
