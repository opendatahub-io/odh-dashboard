import * as React from 'react';
import {
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  ChipGroup,
  Chip,
  Button,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons/dist/esm/icons/times-icon';

export type SelectionOptions = {
  id: number | string;
  name: string;
  selected?: boolean;
};

type MultiSelectionProps = {
  value: SelectionOptions[];
  setValue: (itemSelection: SelectionOptions[]) => void;
  ariaLabel: string;
};

export const MultiSelection: React.FC<MultiSelectionProps> = ({ value, setValue }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>('');
  const [focusedItemIndex, setFocusedItemIndex] = React.useState<number | null>(null);
  const [activeItem, setActiveItem] = React.useState<string | null>(null);
  const textInputRef = React.useRef<HTMLInputElement>();
  const selected = React.useMemo(() => value.filter((v) => v.selected), [value]);
  const selectOptions = React.useMemo(
    () =>
      value.filter((v) => !inputValue || v.name.toLowerCase().includes(inputValue.toLowerCase())),
    [inputValue, value],
  );

  React.useEffect(() => {
    if (inputValue) {
      setIsOpen(true);
    }
    setFocusedItemIndex(null);
    setActiveItem(null);
  }, [inputValue]);

  const handleMenuArrowKeys = (key: string) => {
    let indexToFocus;
    if (!isOpen) {
      setIsOpen(true);
      return;
    }

    if (key === 'ArrowUp') {
      if (focusedItemIndex === null || focusedItemIndex === 0) {
        indexToFocus = selectOptions.length - 1;
      } else {
        indexToFocus = focusedItemIndex - 1;
      }
    }

    if (key === 'ArrowDown') {
      if (focusedItemIndex === null || focusedItemIndex === selectOptions.length - 1) {
        indexToFocus = 0;
      } else {
        indexToFocus = focusedItemIndex + 1;
      }
    }

    if (indexToFocus != null) {
      setFocusedItemIndex(indexToFocus);
      const focusedItem = selectOptions[indexToFocus];
      setActiveItem(`select-multi-typeahead-${focusedItem.name.replace(' ', '-')}`);
    }
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const focusedItem = focusedItemIndex !== null ? selectOptions[focusedItemIndex] : null;
    switch (event.key) {
      case 'Enter':
        if (isOpen && focusedItem) {
          onSelect(focusedItem);
        }
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Tab':
      case 'Escape':
        setIsOpen(false);
        setActiveItem(null);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        handleMenuArrowKeys(event.key);
        break;
    }
  };

  const onToggleClick = () => {
    setIsOpen(!isOpen);
    setTimeout(() => textInputRef.current?.focus(), 100);
  };
  const onTextInputChange = (_event: React.FormEvent<HTMLInputElement>, valueOfInput: string) => {
    setInputValue(valueOfInput);
  };
  const onSelect = (menuItem?: SelectionOptions) => {
    if (menuItem) {
      setValue(
        selected.includes(menuItem)
          ? value.map((option) => (option === menuItem ? { ...option, selected: false } : option))
          : value.map((option) => (option === menuItem ? { ...option, selected: true } : option)),
      );
    }
    textInputRef.current?.focus();
  };

  const noSelectedItems = value.filter((option) => option.selected).length === 0;

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      variant="typeahead"
      aria-label="Options menu"
      onClick={onToggleClick}
      innerRef={toggleRef}
      isExpanded={isOpen}
      isFullWidth
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={inputValue}
          onClick={onToggleClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
          innerRef={textInputRef}
          {...(activeItem && { 'aria-activedescendant': activeItem })}
          role="combobox"
          isExpanded={isOpen}
          aria-controls="select-multi-typeahead-listbox"
        >
          <ChipGroup aria-label="Current selections">
            {selected.map((selection, index) => (
              <Chip
                key={index}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onSelect(selection);
                }}
              >
                {selection.name}
              </Chip>
            ))}
          </ChipGroup>
        </TextInputGroupMain>
        <TextInputGroupUtilities>
          {selected.length > 0 && (
            <Button
              variant="plain"
              onClick={() => {
                setInputValue('');
                setValue(value.map((option) => ({ ...option, selected: false })));
                textInputRef.current?.focus();
              }}
              aria-label="Clear input value"
            >
              <TimesIcon aria-hidden />
            </Button>
          )}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <>
      <Select
        isOpen={isOpen}
        selected={selected}
        onSelect={(ev, selection) => onSelect(value.find((option) => option.name === selection))}
        onOpenChange={() => setIsOpen(false)}
        toggle={toggle}
      >
        <SelectList isAriaMultiselectable>
          {selectOptions.length === 0 && inputValue ? (
            <SelectOption isDisabled>No results found</SelectOption>
          ) : (
            selectOptions.map((option, index) => (
              <SelectOption
                key={option.name}
                isFocused={focusedItemIndex === index}
                id={`select-multi-typeahead-${option.name.replace(' ', '-')}`}
                value={option.name}
                ref={null}
              >
                {option.name}
              </SelectOption>
            ))
          )}
        </SelectList>
      </Select>
      {noSelectedItems && (
        <HelperText>
          <HelperTextItem variant="error" hasIcon data-testid="group-selection-error-text">
            One or more group must be selected
          </HelperTextItem>
        </HelperText>
      )}
    </>
  );
};
