import * as React from 'react';
import { Flex, FlexItem, Tooltip } from '@patternfly/react-core';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import { RoleRef } from '#~/concepts/permissions/types';
import {
  hasRoleRef,
  getRoleByRef,
  getRoleDisplayName,
  getRoleLabelTypeForRoleRef,
  getRoleRefKey,
} from '#~/concepts/permissions/utils';
import { DEFAULT_ROLE_DESCRIPTIONS } from '#~/concepts/permissions/const';
import RoleLabel from '#~/pages/projects/projectPermissions/components/RoleLabel';
import type { RoleDisplay } from '#~/pages/projects/projectPermissions/types';

type RoleRefSelectProps = {
  subjectKind: 'user' | 'group';
  availableRoles: RoleRef[];
  assignedRoles?: RoleRef[];
  value?: RoleRef;
  isDisabled: boolean;
  disabledTooltip?: string;
  onChange: (roleRef: RoleRef | undefined) => void;
  dataTestId: string;
};

const RoleRefSelect: React.FC<RoleRefSelectProps> = ({
  subjectKind,
  availableRoles,
  assignedRoles,
  value,
  isDisabled,
  disabledTooltip,
  onChange,
  dataTestId,
}) => {
  const { roles, clusterRoles } = usePermissionsContext();

  const resolveRoleDisplay = React.useCallback(
    (roleRef: RoleRef): RoleDisplay => {
      const role = getRoleByRef(roles.data, clusterRoles.data, roleRef);
      const key = getRoleRefKey(roleRef);

      return {
        name: getRoleDisplayName(roleRef, role),
        labelType: getRoleLabelTypeForRoleRef(roleRef, role),
        description:
          DEFAULT_ROLE_DESCRIPTIONS[key] ??
          role?.metadata.annotations?.['openshift.io/description'],
      };
    },
    [clusterRoles.data, roles.data],
  );

  const renderRoleLabel = React.useCallback(
    (roleRef: RoleRef): React.ReactNode => {
      const roleDisplay = resolveRoleDisplay(roleRef);
      return (
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem style={{ flex: 1 }}>{roleDisplay.name}</FlexItem>
          <FlexItem>
            <RoleLabel type={roleDisplay.labelType} />
          </FlexItem>
        </Flex>
      );
    },
    [resolveRoleDisplay],
  );

  const options: SimpleSelectOption[] = React.useMemo(
    () =>
      availableRoles.map((r) => {
        const disabled = assignedRoles ? hasRoleRef(assignedRoles, r) : false;
        const dropdownLabel = renderRoleLabel(r);
        const roleDisplay = resolveRoleDisplay(r);

        return {
          key: getRoleRefKey(r),
          label: roleDisplay.name,
          description: roleDisplay.description,
          dropdownLabel: disabled ? (
            <Tooltip content={`The selected ${subjectKind} has already owned this role.`}>
              <span>{dropdownLabel}</span>
            </Tooltip>
          ) : (
            dropdownLabel
          ),
          isAriaDisabled: disabled,
        };
      }),
    [assignedRoles, availableRoles, renderRoleLabel, resolveRoleDisplay, subjectKind],
  );

  const selectedKey = value ? getRoleRefKey(value) : '';
  const toggleLabel = value ? renderRoleLabel(value) : undefined;

  const select = (
    <SimpleSelect
      dataTestId={dataTestId}
      isFullWidth
      placeholder="Select a role"
      options={options}
      value={selectedKey}
      toggleLabel={toggleLabel}
      onChange={(key) => {
        const match = availableRoles.find((r) => getRoleRefKey(r) === key);
        onChange(match);
      }}
      isDisabled={isDisabled}
      previewDescription={false}
    />
  );

  if (isDisabled && disabledTooltip) {
    return (
      <Tooltip content={disabledTooltip}>
        <span>{select}</span>
      </Tooltip>
    );
  }

  return select;
};

export default RoleRefSelect;
