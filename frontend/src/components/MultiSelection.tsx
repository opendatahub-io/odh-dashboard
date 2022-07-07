import React, { useEffect, useState } from 'react';
import {
  HelperText,
  HelperTextItem,
  Select,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
} from '@patternfly/react-core';
import { MenuItemStatus } from 'pages/groupSettings/GroupTypes';

type MenuOptionMultiSelectProps = {
  initialState: MenuItemStatus[];
  onChange: (itemSelection: MenuItemStatus[]) => void;
};

const ARIAL_LABEL = 'Select a group';
const ERROR_LABEL = 'One or more group must be selected';

export const MenuOptionMultiSelect: React.FC<MenuOptionMultiSelectProps> = ({
  initialState,
  onChange,
}) => {
  const [menuItemsState, setMenuItemsState] = useState<MenuItemStatus[] | undefined>();
  const [showMenu, setShowMenu] = useState<boolean>(false);

  useEffect(() => {
    setMenuItemsState(initialState);
  }, [initialState]);

  const toggleMenu = (isOpen: React.SetStateAction<boolean>) => {
    setShowMenu(isOpen);
  };

  const onSelect = (
    _: React.MouseEvent<Element, MouseEvent> | React.ChangeEvent<Element>,
    value: string | SelectOptionObject,
  ) => {
    try {
      if (menuItemsState?.filter((option) => option.name === value).length) {
        const newState = menuItemsState.map((element) =>
          element.name === value ? { ...element, enabled: !element.enabled } : element,
        );
        setMenuItemsState(newState);
        onChange(newState);
      }
    } catch (e) {
      // Error.
    }
  };

  const clearSelection = () => {
    const newState = menuItemsState?.map((element) => ({ ...element, enabled: false }));
    setMenuItemsState(newState);
    if (newState) onChange(newState);
  };

  return (
    <>
      <Select
        variant={SelectVariant.typeaheadMulti}
        onToggle={toggleMenu}
        onSelect={onSelect}
        onClear={clearSelection}
        selections={menuItemsState?.flatMap((element) => (element.enabled ? element.name : []))}
        isOpen={showMenu}
        aria-labelledby={ARIAL_LABEL}
        isCreatable={false}
        onCreateOption={undefined}
        validated={
          menuItemsState?.filter((option) => option.enabled).length === 0 ? 'error' : 'default'
        }
      >
        {menuItemsState?.map((option, index) => (
          <SelectOption isDisabled={false} key={index} value={option.name} />
        ))}
      </Select>
      {menuItemsState?.filter((option) => option.enabled).length === 0 && (
        <HelperText>
          <HelperTextItem variant="error" hasIcon>
            {ERROR_LABEL}
          </HelperTextItem>
        </HelperText>
      )}
    </>
  );
};
