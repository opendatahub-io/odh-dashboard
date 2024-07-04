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
  SelectGroup,
  Divider,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons/dist/esm/icons/times-icon';

export type SelectionOptions = {
  id: number | string;
  name: string;
  selected?: boolean;
};

export type GroupSelectionOptions = {
  id: number | string;
  name: string;
  values: SelectionOptions[];
};

type MultiSelectionProps = {
  id?: string;
  value?: SelectionOptions[];
  groupedValues?: GroupSelectionOptions[];
  setValue: (itemSelection: SelectionOptions[]) => void;
  toggleId?: string;
  ariaLabel: string;
  placeholder?: string;
  isDisabled?: boolean;
  selectionRequired?: boolean;
  noSelectedOptionsMessage?: string;
};

export const MultiSelection: React.FC<MultiSelectionProps> = ({
  value = [],
  groupedValues = [],
  setValue,
  placeholder,
  isDisabled,
  ariaLabel = 'Options menu',
  id,
  toggleId,
  selectionRequired,
  noSelectedOptionsMessage = 'One or more options must be selected',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>('');
  const [focusedItemIndex, setFocusedItemIndex] = React.useState<number | null>(null);
  const [activeItem, setActiveItem] = React.useState<string | null>(null);
  const textInputRef = React.useRef<HTMLInputElement>();
  const selectGroups = React.useMemo(() => {
    let counter = 0;
    return groupedValues
      .map((g) => {
        const values = g.values.filter(
          (v) => !inputValue || v.name.toLowerCase().includes(inputValue.toLowerCase()),
        );
        return {
          ...g,
          values: values.map((v) => ({ ...v, index: counter++ })),
        };
      })
      .filter((g) => g.values.length);
  }, [inputValue, groupedValues]);

  const setOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setInputValue('');
    }
  };
  const groupOptions = selectGroups.reduce<SelectionOptions[]>((acc, g) => {
    acc.push(...g.values);
    return acc;
  }, []);

  const selectOptions = React.useMemo(
    () =>
      value
        .filter((v) => !inputValue || v.name.toLowerCase().includes(inputValue.toLowerCase()))
        .map((v, index) => ({ ...v, index: groupOptions.length + index })),
    [groupOptions, inputValue, value],
  );

  const allOptions = React.useMemo(() => {
    const options = [];
    groupedValues.forEach((group) => options.push(...group.values));
    options.push(...value);

    return options;
  }, [groupedValues, value]);

  const visibleOptions = [...groupOptions, ...selectOptions];

  const selected = React.useMemo(() => allOptions.filter((v) => v.selected), [allOptions]);

  React.useEffect(() => {
    if (inputValue) {
      setOpen(true);
    }
    setFocusedItemIndex(null);
    setActiveItem(null);
  }, [inputValue]);

  const handleMenuArrowKeys = (key: string) => {
    let indexToFocus;
    if (!isOpen) {
      setOpen(true);
      setFocusedItemIndex(0);
      return;
    }

    const optionsLength = visibleOptions.length;

    if (key === 'ArrowUp') {
      if (focusedItemIndex === null || focusedItemIndex === 0) {
        indexToFocus = optionsLength - 1;
      } else {
        indexToFocus = focusedItemIndex - 1;
      }
    }

    if (key === 'ArrowDown') {
      if (focusedItemIndex === null || focusedItemIndex === optionsLength - 1) {
        indexToFocus = 0;
      } else {
        indexToFocus = focusedItemIndex + 1;
      }
    }

    if (indexToFocus != null) {
      setFocusedItemIndex(indexToFocus);
      const focusedItem = visibleOptions[indexToFocus];
      setActiveItem(`select-multi-typeahead-${focusedItem.name.replace(' ', '-')}`);
    }
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const focusedItem = focusedItemIndex !== null ? visibleOptions[focusedItemIndex] : null;
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
        setOpen(false);
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
    setOpen(!isOpen);
    setTimeout(() => textInputRef.current?.focus(), 100);
  };
  const onTextInputChange = (_event: React.FormEvent<HTMLInputElement>, valueOfInput: string) => {
    setInputValue(valueOfInput);
  };
  const onSelect = (menuItem?: SelectionOptions) => {
    if (menuItem) {
      setValue(
        selected.includes(menuItem)
          ? allOptions.map((option) =>
              option === menuItem ? { ...option, selected: false } : option,
            )
          : allOptions.map((option) =>
              option === menuItem ? { ...option, selected: true } : option,
            ),
      );
    }
    textInputRef.current?.focus();
  };

  const noSelectedItems = allOptions.filter((option) => option.selected).length === 0;

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      id={toggleId}
      variant="typeahead"
      status={selectionRequired && noSelectedItems ? 'danger' : undefined}
      aria-label={ariaLabel}
      onClick={onToggleClick}
      innerRef={toggleRef}
      isDisabled={isDisabled}
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
          placeholder={placeholder}
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
                setValue(allOptions.map((option) => ({ ...option, selected: false })));
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
        id={id}
        isOpen={isOpen}
        selected={selected}
        onSelect={(ev, selection) => {
          const selectedOption = allOptions.find((option) => option.id === selection);
          onSelect(selectedOption);
        }}
        onOpenChange={() => setOpen(false)}
        toggle={toggle}
      >
        {visibleOptions.length === 0 && inputValue ? (
          <SelectList isAriaMultiselectable>
            <SelectOption isDisabled>No results found</SelectOption>
          </SelectList>
        ) : null}
        {selectGroups.map((g, index) => (
          <>
            <SelectGroup label={g.name} key={g.id}>
              <SelectList isAriaMultiselectable>
                {g.values.map((option) => (
                  <SelectOption
                    key={option.name}
                    isFocused={focusedItemIndex === option.index}
                    id={`select-multi-typeahead-${option.name.replace(' ', '-')}`}
                    value={option.id}
                    ref={null}
                    isSelected={option.selected}
                  >
                    {option.name}
                  </SelectOption>
                ))}
              </SelectList>
            </SelectGroup>
            {index < selectGroups.length - 1 || selectOptions.length ? <Divider /> : null}
          </>
        ))}
        {selectOptions.length ? (
          <SelectList isAriaMultiselectable>
            {selectOptions.map((option) => (
              <SelectOption
                key={option.name}
                isFocused={focusedItemIndex === option.index}
                id={`select-multi-typeahead-${option.name.replace(' ', '-')}`}
                value={option.id}
                ref={null}
                isSelected={option.selected}
              >
                {option.name}
              </SelectOption>
            ))}
          </SelectList>
        ) : null}
      </Select>
      {noSelectedItems && selectionRequired && (
        <HelperText isLiveRegion>
          <HelperTextItem variant="error" hasIcon data-testid="group-selection-error-text">
            {noSelectedOptionsMessage}
          </HelperTextItem>
        </HelperText>
      )}
    </>
  );
};
