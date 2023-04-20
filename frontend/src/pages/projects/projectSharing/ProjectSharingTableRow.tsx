import * as React from 'react';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  Button,
  DropdownDirection,
  Select,
  SelectOption,
  SelectVariant,
  Text,
} from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { RoleBindingKind } from '~/k8sTypes';
import { castProjectSharingRoleType, formatDate } from './utils';
import { ProjectSharingRoleType } from './types';

type ProjectSharingTableRowProps = {
  obj: RoleBindingKind;
  isEditing: boolean;
  typeAhead: string[];
  onCreateOrEditRoleBinding: (
    name: string,
    roleType: ProjectSharingRoleType,
    rolebinding: RoleBindingKind,
  ) => void;
  onCancelRoleBindingCreation: () => void;
  onEditRoleBinding: (rolebinding: RoleBindingKind) => void;
  onDeleteRoleBinding: (rolebinding: RoleBindingKind) => void;
};

const ProjectSharingTableRow: React.FC<ProjectSharingTableRowProps> = ({
  obj,
  isEditing,
  typeAhead,
  onCreateOrEditRoleBinding,
  onCancelRoleBindingCreation,
  onEditRoleBinding,
  onDeleteRoleBinding,
}) => {
  const [roleBindingName, setRoleBindingName] = React.useState(obj.subjects[0]?.name || '');
  const [roleBindingRoleRef, setRoleBindingRoleRef] = React.useState<ProjectSharingRoleType>(
    castProjectSharingRoleType(obj.roleRef.name) || ProjectSharingRoleType.EDIT,
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [isOpenName, setIsOpenName] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Username">
          {isEditing ? (
            <Select
              variant={SelectVariant.typeahead}
              typeAheadAriaLabel="Name selection"
              selections={roleBindingName}
              onToggle={(isOpened) => {
                setIsOpenName(isOpened);
              }}
              onSelect={(e, selection) => {
                if (typeof selection === 'string') {
                  setRoleBindingName(selection);
                  setIsOpenName(false);
                }
              }}
              onClear={() => setRoleBindingName('')}
              isOpen={isOpenName}
              isCreatable={true}
              aria-labelledby="name-selection"
              placeholderText={roleBindingName}
            >
              {typeAhead.map((option, index) => (
                <SelectOption key={index} value={option} />
              ))}
            </Select>
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
                  title: 'Edit',
                  onClick: () => {
                    onEditRoleBinding(obj);
                  },
                },
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
              isDisabled={isLoading || !roleBindingName || !roleBindingRoleRef}
              onClick={() => {
                setIsLoading(true);
                onCreateOrEditRoleBinding(roleBindingName, roleBindingRoleRef, obj);
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
