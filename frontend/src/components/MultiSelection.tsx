import * as React from 'react';
import {
  HelperText,
  HelperTextItem,
  Select,
  SelectOption,
  SelectVariant,
} from '@patternfly/react-core';
import { MenuItemStatus } from 'pages/groupSettings/groupTypes';

type MultiSelectionProps = {
  value: MenuItemStatus[];
  setValue: (itemSelection: MenuItemStatus[]) => void;
};

export const MultiSelection: React.FC<MultiSelectionProps> = ({ value, setValue }) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const toggleMenu = (isOpen: React.SetStateAction<boolean>) => {
    setShowMenu(isOpen);
  };

  const clearSelection = () => {
    const newState = value?.map((element) => ({ ...element, enabled: false }));
    setValue(newState);
  };

  const noSelectedItems = value?.filter((option) => option.enabled).length === 0;

  return (
    <>
      <Select
        removeFindDomNode
        variant={SelectVariant.typeaheadMulti}
        onToggle={toggleMenu}
        onSelect={(e, newValue) => {
          if (value?.filter((option) => option.name === newValue).length) {
            const newState = value.map((element) =>
              element.name === newValue ? { ...element, enabled: !element.enabled } : element,
            );
            setValue(newState);
          }
        }}
        onClear={clearSelection}
        selections={value?.filter((element) => element.enabled).map((element) => element.name)}
        isOpen={showMenu}
        aria-labelledby="Select a group"
        isCreatable={false}
        onCreateOption={undefined}
        validated={noSelectedItems ? 'error' : 'default'}
      >
        {value?.map((option, index) => (
          <SelectOption isDisabled={false} key={index} value={option.name} />
        ))}
      </Select>
      {noSelectedItems && (
        <HelperText>
          <HelperTextItem variant="error" hasIcon>
            One or more group must be selected
          </HelperTextItem>
        </HelperText>
      )}
    </>
  );
};
