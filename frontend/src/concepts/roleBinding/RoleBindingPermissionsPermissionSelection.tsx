import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import React from 'react';
import { RoleBindingPermissionsRoleType } from './types';
import { castRoleBindingPermissionsRoleType, roleLabel } from './utils';

type RoleBindingPermissionsPermissionSelectionProps = {
  selection: string;
  permissionOptions: {
    type: RoleBindingPermissionsRoleType;
    description: string;
  }[];
  onSelect: (roleType: RoleBindingPermissionsRoleType) => void;
};

const RoleBindingPermissionsPermissionSelection: React.FC<
  RoleBindingPermissionsPermissionSelectionProps
> = ({ selection, onSelect, permissionOptions }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Select
      selections={selection}
      isOpen={isOpen}
      onSelect={(e, newSelection) => {
        if (typeof newSelection === 'string') {
          onSelect(castRoleBindingPermissionsRoleType(newSelection));
          setIsOpen(false);
        }
      }}
      onToggle={(e, val) => setIsOpen(val)}
      placeholderText={selection}
      direction="down"
    >
      {permissionOptions.map((option) => (
        <SelectOption key={option.type} value={option.type} description={option.description}>
          {roleLabel(option.type)}
        </SelectOption>
      ))}
    </Select>
  );
};

export default RoleBindingPermissionsPermissionSelection;
