import * as React from 'react';
import {
  Label,
  LabelGroup,
  /**
   * The Select component is used to build another generic component here
   */
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  Button,
  HelperText,
  HelperTextItem,
  SelectGroup,
  Divider,
  SelectOptionProps,
  SelectPopperProps,
} from '@patternfly/react-core';

import { TimesIcon } from '@patternfly/react-icons/dist/esm/icons/times-icon';

export type SelectionOptions = Omit<SelectOptionProps, 'id'> & {
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
  isScrollable?: boolean;
  toggleId?: string;
  inputId?: string;
  ariaLabel: string;
  placeholder?: string;
  isDisabled?: boolean;
  selectionRequired?: boolean;
  noSelectedOptionsMessage?: string;
  toggleTestId?: string;
  /** Test ID for the dropdown list */
  listTestId?: string;
  /** Flag to indicate if the typeahead select allows new items */
  isCreatable?: boolean;
  /** Flag to indicate if create option should be at top of typeahead */
  isCreateOptionOnTop?: boolean;
  /** Message to display to create a new option */
  createOptionMessage?: string | ((newValue: string) => string);
  filterFunction?: (filterText: string, options: SelectionOptions[]) => SelectionOptions[];
  popperProps?: SelectPopperProps;
};

const defaultCreateOptionMessage = (newValue: string) => `Create "${newValue}"`;
const defaultFilterFunction = (filterText: string, options: SelectionOptions[]) =>
  options.filter((o) => !filterText || o.name.toLowerCase().includes(filterText.toLowerCase()));

export const MultiSelection: React.FC<MultiSelectionProps> = ({
  value = [],
  groupedValues = [],
  setValue,
  isScrollable = false,
  placeholder,
  isDisabled,
  ariaLabel = 'Options menu',
  id,
  toggleId,
  inputId,
  toggleTestId,
  listTestId,
  selectionRequired,
  noSelectedOptionsMessage = 'One or more options must be selected',
  isCreatable = false,
  isCreateOptionOnTop = false,
  createOptionMessage = defaultCreateOptionMessage,
  filterFunction = defaultFilterFunction,
  popperProps,
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
        const values = filterFunction(inputValue, g.values);
        return {
          ...g,
          values: values.map((v) => ({ ...v, index: counter++ })),
        };
      })
      .filter((g) => g.values.length);
  }, [filterFunction, groupedValues, inputValue]);

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
      filterFunction(inputValue, value).map((v, index) => ({
        ...v,
        index: groupOptions.length + index,
      })),
    [filterFunction, groupOptions, inputValue, value],
  );

  const allValues = React.useMemo(() => {
    const options = [];
    groupedValues.forEach((group) => options.push(...group.values));
    options.push(...value);
    return options;
  }, [groupedValues, value]);

  const createOption = React.useMemo(() => {
    const inputValueTrim = inputValue.trim();

    if (
      isCreatable &&
      inputValueTrim &&
      !allValues.find((o) => String(o.name).toLowerCase() === inputValueTrim.toLowerCase())
    ) {
      return {
        id: inputValueTrim,
        name:
          typeof createOptionMessage === 'string'
            ? createOptionMessage
            : createOptionMessage(inputValueTrim),
        selected: false,
      };
    }
    return undefined;
  }, [inputValue, isCreatable, createOptionMessage, allValues]);

  const allOptions = React.useMemo(() => {
    const options = [...allValues];
    if (createOption) {
      options.push(createOption);
    }
    return options;
  }, [allValues, createOption]);

  const visibleOptions = React.useMemo(() => {
    let options = [...groupOptions, ...selectOptions];
    if (createOption) {
      options = isCreateOptionOnTop ? [createOption, ...options] : [...options, createOption];
    }
    return options;
  }, [groupOptions, selectOptions, createOption, isCreateOptionOnTop]);

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
          setInputValue('');
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
        allOptions.map((option) =>
          option.id === menuItem.id ? { ...option, selected: !option.selected } : option,
        ),
      );
      setInputValue('');
    }
    textInputRef.current?.focus();
  };

  const noSelectedItems = allOptions.filter((option) => option.selected).length === 0;

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      id={toggleId}
      data-testid={toggleTestId}
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
          inputId={inputId}
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
          <LabelGroup aria-label="Current selections">
            {selected.map((selection, index) => (
              <Label
                variant="outline"
                key={index}
                onClose={(ev) => {
                  ev.stopPropagation();
                  onSelect(selection);
                }}
              >
                {selection.name}
              </Label>
            ))}
          </LabelGroup>
        </TextInputGroupMain>
        <TextInputGroupUtilities>
          {selected.length > 0 && (
            <Button
              icon={<TimesIcon aria-hidden />}
              variant="plain"
              onClick={() => {
                setInputValue('');
                setValue(allOptions.map((option) => ({ ...option, selected: false })));
                textInputRef.current?.focus();
              }}
              aria-label="Clear input value"
            />
          )}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <>
      <Select
        isScrollable={isScrollable}
        id={id}
        isOpen={isOpen}
        selected={selected}
        onSelect={(ev, selection) => {
          const selectedOption = allOptions.find((option) => option.id === selection);
          onSelect(selectedOption);
        }}
        onOpenChange={() => setOpen(false)}
        toggle={toggle}
        popperProps={popperProps}
      >
        {createOption && isCreateOptionOnTop && groupOptions.length > 0 ? (
          <SelectList isAriaMultiselectable>
            <SelectOption value={createOption.id} isFocused={focusedItemIndex === 0}>
              {createOption.name}
            </SelectOption>
          </SelectList>
        ) : null}
        {!createOption && visibleOptions.length === 0 && inputValue ? (
          <SelectList isAriaMultiselectable>
            <SelectOption isDisabled>No results found</SelectOption>
          </SelectList>
        ) : null}
        {selectGroups.map((g, index) => (
          <React.Fragment key={g.id}>
            <SelectGroup label={g.name} key={g.id}>
              <SelectList isAriaMultiselectable>
                {g.values.map((option) => (
                  <SelectOption
                    key={option.name}
                    isFocused={focusedItemIndex === option.index + (isCreateOptionOnTop ? 1 : 0)}
                    data-testid={`select-multi-typeahead-${option.name.replace(' ', '-')}`}
                    value={option.id}
                    ref={null}
                    isSelected={option.selected}
                    description={option.description}
                  >
                    {option.name}
                  </SelectOption>
                ))}
              </SelectList>
            </SelectGroup>
            {index < selectGroups.length - 1 || selectOptions.length ? <Divider /> : null}
          </React.Fragment>
        ))}
        {selectOptions.length ||
        (createOption && (!isCreateOptionOnTop || groupOptions.length === 0)) ? (
          <SelectList isAriaMultiselectable data-testid={listTestId}>
            {createOption && isCreateOptionOnTop && groupOptions.length === 0 ? (
              <SelectOption value={createOption.id}>{createOption.name}</SelectOption>
            ) : null}
            {selectOptions.map((option) => (
              <SelectOption
                key={option.name}
                isFocused={focusedItemIndex === option.index + (isCreateOptionOnTop ? 1 : 0)}
                data-testid={`select-multi-typeahead-${option.name.replace(' ', '-')}`}
                value={option.id}
                ref={null}
                isSelected={option.selected}
                description={option.description}
              >
                {option.name}
              </SelectOption>
            ))}
            {createOption && !isCreateOptionOnTop ? (
              <SelectOption
                data-testid={`select-multi-typeahead-${Option.name.replace(' ', '-')}`}
                value={createOption.id}
                isFocused={focusedItemIndex === visibleOptions.length - 1}
              >
                {createOption.name}
              </SelectOption>
            ) : null}
          </SelectList>
        ) : null}
      </Select>
      {noSelectedItems && selectionRequired && (
        <HelperText isLiveRegion>
          <HelperTextItem variant="error" data-testid="group-selection-error-text">
            {noSelectedOptionsMessage}
          </HelperTextItem>
        </HelperText>
      )}
    </>
  );
};
