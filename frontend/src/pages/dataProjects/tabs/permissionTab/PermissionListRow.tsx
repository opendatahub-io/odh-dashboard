import * as React from 'react';
import {
  ActionsColumn,
  IAction,
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import {
  Button,
  OverflowMenu,
  OverflowMenuContent,
  Select,
  SelectOption,
  SelectOptionObject,
  TextInput,
  Title,
} from '@patternfly/react-core';

import '../DataProjectTabs.scss';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { PermissionType } from '../../../../types';

type PermissionListRowProps = {
  title: string;
  index: number;
  row: any;
  handleNameChange: (value: string, index: number) => void;
  handlePermissionSelection: (selection: string | SelectOptionObject, index: number) => void;
  handleSubmitRow: (index: number) => void;
  handleRemoveRow: (index: number) => void;
};

const PermissionListRow: React.FC<PermissionListRowProps> = ({
  title,
  index,
  row,
  handleNameChange,
  handlePermissionSelection,
  handleSubmitRow,
  handleRemoveRow,
}) => {
  const [permissionDropdownOpen, setPermissionDropdownOpen] = React.useState(false);

  const permissionOptions = [
    <SelectOption key={0} value={PermissionType.View} />,
    <SelectOption key={1} value={PermissionType.Edit} />,
  ];

  const onToggle = (isOpen: boolean) => {
    setPermissionDropdownOpen(isOpen);
  };

  const handleSelection = (e, selection) => {
    handlePermissionSelection(selection, index);
    setPermissionDropdownOpen(false);
  };

  return (
    <Tr className="odh-data-projects__tabs-list-editable-row">
      <Td dataLabel={title}>
        <TextInput
          aria-label={`${title} name input`}
          value={row.name}
          type="text"
          onChange={(value) => handleNameChange(value, index)}
        />
      </Td>
      <Td dataLabel="Permission">
        <Select
          aria-label="Select permission"
          isOpen={permissionDropdownOpen}
          selections={row.permission}
          onToggle={onToggle}
          onSelect={handleSelection}
        >
          {permissionOptions}
        </Select>
      </Td>
      <Td isActionCell>
        <div>
          <Button
            isInline
            variant="plain"
            aria-label="Add new row"
            onClick={() => {
              handleSubmitRow(index);
              handleRemoveRow(index);
            }}
          >
            <CheckIcon />
          </Button>
          <Button
            isInline
            variant="plain"
            aria-label="Remove new row"
            onClick={() => handleRemoveRow(index)}
          >
            <TimesIcon />
          </Button>
        </div>
      </Td>
    </Tr>
  );
};

PermissionListRow.displayName = 'PermissionListRow';

export default PermissionListRow;
