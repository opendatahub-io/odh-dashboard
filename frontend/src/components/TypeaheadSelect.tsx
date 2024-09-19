import React from 'react';
import {
  Select,
  SelectOption,
  SelectList,
  SelectOptionProps,
  MenuToggle,
  MenuToggleElement,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  Button,
  MenuToggleProps,
  SelectProps,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';

export interface TypeaheadSelectOption extends Omit<SelectOptionProps, 'content' | 'isSelected'> {
  /** Content of the select option. */
  content: string | number;
  /** Value of the select option. */
  value: string | number;
  /** Indicator for option being selected */
  isSelected?: boolean;
}

export interface TypeaheadSelectProps extends Omit<SelectProps, 'toggle' | 'onSelect'> {
  /** Options of the select */
  selectOptions: TypeaheadSelectOption[];
  /** Callback triggered on selection. */
  onSelect?: (
    _event:
      | React.MouseEvent<Element, MouseEvent>
      | React.KeyboardEvent<HTMLInputElement>
      | undefined,
    selection: string | number,
  ) => void;
  /** Callback triggered when the select opens or closes. */
  onToggle?: (nextIsOpen: boolean) => void;
  /** Callback triggered when the text in the input field changes. */
  onInputChange?: (newValue: string) => void;
  /** Function to return items matching the current filter value */
  filterFunction?: (
    filterValue: string,
    options: TypeaheadSelectOption[],
  ) => TypeaheadSelectOption[];
  /** Callback triggered when the clear button is selected */
  onClearSelection?: () => void;
  /** Flag to allow clear current selection */
  allowClear?: boolean;
  /** Placeholder text for the select input. */
  placeholder?: string;
  /** Flag to indicate if the typeahead select allows new items */
  isCreatable?: boolean;
  /** Flag to indicate if create option should be at top of typeahead */
  isCreateOptionOnTop?: boolean;
  /** Message to display to create a new option */
  createOptionMessage?: string | ((newValue: string) => string);
  /** Message to display when no options are available. */
  noOptionsAvailableMessage?: string;
  /** Message to display when no options match the filter. */
  noOptionsFoundMessage?: string | ((filter: string) => string);
  /** Flag indicating the select should be disabled. */
  isDisabled?: boolean;
  /** Width of the toggle. */
  toggleWidth?: string;
  /** Additional props passed to the toggle. */
  toggleProps?: MenuToggleProps;
}

const defaultNoOptionsFoundMessage = (filter: string) => `No results found for "${filter}"`;
const defaultCreateOptionMessage = (newValue: string) => `Create "${newValue}"`;
const defaultFilterFunction = (filterValue: string, options: TypeaheadSelectOption[]) =>
  options.filter((o) => String(o.content).toLowerCase().includes(filterValue.toLowerCase()));

const TypeaheadSelect: React.FunctionComponent<TypeaheadSelectProps> = ({
  innerRef,
  selectOptions,
  onSelect,
  onToggle,
  onInputChange,
  filterFunction = defaultFilterFunction,
  onClearSelection,
  allowClear,
  placeholder = 'Select an option',
  noOptionsAvailableMessage = 'No options are available',
  noOptionsFoundMessage = defaultNoOptionsFoundMessage,
  isCreatable = false,
  isCreateOptionOnTop = false,
  createOptionMessage = defaultCreateOptionMessage,
  isDisabled,
  toggleWidth,
  toggleProps,
  ...props
}: TypeaheadSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState<string>('');
  const [isFiltering, setIsFiltering] = React.useState<boolean>(false);
  const [focusedItemIndex, setFocusedItemIndex] = React.useState<number | null>(null);
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const textInputRef = React.useRef<HTMLInputElement>();

  const NO_RESULTS = 'no results';

  const selected = React.useMemo(
    () => selectOptions.find((option) => option.value === props.selected || option.isSelected),
    [props.selected, selectOptions],
  );

  const filteredSelections = React.useMemo(() => {
    let newSelectOptions: TypeaheadSelectOption[] = selectOptions;

    // Filter menu items based on the text input value when one exists
    if (isFiltering && filterValue) {
      newSelectOptions = filterFunction(filterValue, selectOptions);

      if (
        isCreatable &&
        filterValue.trim() &&
        !newSelectOptions.find((o) => String(o.content).toLowerCase() === filterValue.toLowerCase())
      ) {
        const createOption = {
          content:
            typeof createOptionMessage === 'string'
              ? createOptionMessage
              : createOptionMessage(filterValue),
          value: filterValue,
        };
        newSelectOptions = isCreateOptionOnTop
          ? [createOption, ...newSelectOptions]
          : [...newSelectOptions, createOption];
      }

      // When no options are found after filtering, display 'No results found'
      if (!newSelectOptions.length) {
        newSelectOptions = [
          {
            isAriaDisabled: true,
            content:
              typeof noOptionsFoundMessage === 'string'
                ? noOptionsFoundMessage
                : noOptionsFoundMessage(filterValue),
            value: NO_RESULTS,
          },
        ];
      }
    }

    // When no options are  available,  display 'No options available'
    if (!newSelectOptions.length) {
      newSelectOptions = [
        {
          isAriaDisabled: true,
          content: noOptionsAvailableMessage,
          value: NO_RESULTS,
        },
      ];
    }

    return newSelectOptions;
  }, [
    isFiltering,
    filterValue,
    filterFunction,
    selectOptions,
    noOptionsFoundMessage,
    isCreatable,
    isCreateOptionOnTop,
    createOptionMessage,
    noOptionsAvailableMessage,
  ]);

  React.useEffect(() => {
    if (isFiltering) {
      openMenu();
    }
    // Don't update on openMenu changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFiltering]);

  const setActiveAndFocusedItem = (itemIndex: number) => {
    setFocusedItemIndex(itemIndex);
    const focusedItem = selectOptions[itemIndex];
    setActiveItemId(String(focusedItem.value));
  };

  const resetActiveAndFocusedItem = () => {
    setFocusedItemIndex(null);
    setActiveItemId(null);
  };

  const openMenu = () => {
    if (!isOpen) {
      if (onToggle) {
        onToggle(true);
      }
      setIsOpen(true);
    }
  };

  const closeMenu = () => {
    if (onToggle) {
      onToggle(false);
    }
    setIsOpen(false);
    resetActiveAndFocusedItem();
    setIsFiltering(false);
    setFilterValue(String(selected?.content ?? ''));
  };

  const onInputClick = () => {
    if (!isOpen) {
      openMenu();
    }
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const selectOption = (
    _event:
      | React.MouseEvent<Element, MouseEvent>
      | React.KeyboardEvent<HTMLInputElement>
      | undefined,
    option: TypeaheadSelectOption,
  ) => {
    if (onSelect) {
      onSelect(_event, option.value);
    }
    closeMenu();
  };

  const handleSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    if (value && value !== NO_RESULTS) {
      const optionToSelect = selectOptions.find((option) => option.value === value);
      if (optionToSelect) {
        selectOption(_event, optionToSelect);
      } else if (isCreatable) {
        selectOption(_event, { value, content: value });
      }
    }
  };

  const onTextInputChange = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    setFilterValue(value || '');
    setIsFiltering(true);
    if (onInputChange) {
      onInputChange(value);
    }
    if (selected && value !== selected.content) {
      // Clear the selection when the input value changes
      if (onSelect) {
        onSelect(undefined, '');
      }
    }
    resetActiveAndFocusedItem();
  };

  const handleMenuArrowKeys = (key: string) => {
    let indexToFocus = 0;

    openMenu();

    if (filteredSelections.every((option) => option.isDisabled)) {
      return;
    }

    if (key === 'ArrowUp') {
      // When no index is set or at the first index, focus to the last, otherwise decrement focus index
      if (focusedItemIndex === null || focusedItemIndex === 0) {
        indexToFocus = filteredSelections.length - 1;
      } else {
        indexToFocus = focusedItemIndex - 1;
      }

      // Skip disabled options
      while (filteredSelections[indexToFocus].isDisabled) {
        indexToFocus--;
        if (indexToFocus === -1) {
          indexToFocus = filteredSelections.length - 1;
        }
      }
    }

    if (key === 'ArrowDown') {
      // When no index is set or at the last index, focus to the first, otherwise increment focus index
      if (focusedItemIndex === null || focusedItemIndex === filteredSelections.length - 1) {
        indexToFocus = 0;
      } else {
        indexToFocus = focusedItemIndex + 1;
      }

      // Skip disabled options
      while (filteredSelections[indexToFocus].isDisabled) {
        indexToFocus++;
        if (indexToFocus === filteredSelections.length) {
          indexToFocus = 0;
        }
      }
    }

    setActiveAndFocusedItem(indexToFocus);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const focusedItem = focusedItemIndex !== null ? filteredSelections[focusedItemIndex] : null;

    switch (event.key) {
      case 'Enter':
        if (
          isOpen &&
          focusedItem &&
          focusedItem.value !== NO_RESULTS &&
          !focusedItem.isAriaDisabled
        ) {
          selectOption(event, focusedItem);
        }

        openMenu();

        break;
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        handleMenuArrowKeys(event.key);
        break;
    }
  };

  const onToggleClick = () => {
    if (!isOpen) {
      openMenu();
    } else {
      closeMenu();
    }
    textInputRef.current?.focus();
  };

  const onClearButtonClick = () => {
    if (isFiltering && filterValue) {
      if (selected && onSelect) {
        onSelect(undefined, selected.value);
      }
      setFilterValue('');
      if (onInputChange) {
        onInputChange('');
      }
      setIsFiltering(false);
    }

    resetActiveAndFocusedItem();
    textInputRef.current?.focus();

    if (onClearSelection) {
      onClearSelection();
    }
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      variant="typeahead"
      aria-label="Typeahead menu toggle"
      onClick={onToggleClick}
      isExpanded={isOpen}
      isDisabled={isDisabled}
      isFullWidth
      style={{ width: toggleWidth }}
      {...toggleProps}
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={isFiltering ? filterValue : selected?.content ?? ''}
          onClick={onInputClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
          innerRef={textInputRef}
          placeholder={placeholder}
          {...(activeItemId && { 'aria-activedescendant': activeItemId })}
          role="combobox"
          isExpanded={isOpen}
          aria-controls="select-typeahead-listbox"
        />
        {(isFiltering && filterValue) || (allowClear && selected) ? (
          <TextInputGroupUtilities>
            <Button variant="plain" onClick={onClearButtonClick} aria-label="Clear input value">
              <TimesIcon aria-hidden />
            </Button>
          </TextInputGroupUtilities>
        ) : null}
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Select
      isOpen={isOpen}
      selected={selected}
      onSelect={handleSelect}
      onOpenChange={(open) => !open && closeMenu()}
      toggle={toggle}
      shouldFocusFirstItemOnOpen={false}
      ref={innerRef}
      {...props}
    >
      <SelectList>
        {filteredSelections.map((option, index) => {
          const { content, value, ...optionProps } = option;
          return (
            <SelectOption
              key={value}
              value={value}
              isFocused={focusedItemIndex === index}
              {...optionProps}
            >
              {content}
            </SelectOption>
          );
        })}
      </SelectList>
    </Select>
  );
};

export default TypeaheadSelect;
