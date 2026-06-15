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
  /** Flag to show checkboxes next to each option */
  hasCheckbox?: boolean;
};

const defaultCreateOptionMessage = (newValue: string) => `Create "${newValue}"`;
const defaultFilterFunction = (filterText: string, options: SelectionOptions[]) =>
  options.filter((o) => !filterText || o.name.toLowerCase().includes(filterText.toLowerCase()));

/** Encode option ids for stable, non-colliding DOM id segments (e.g. 'a b' vs 'a-b'). */
const encodeOptionIdForDom = (optionId: number | string): string =>
  String(optionId).replace(/[^a-zA-Z0-9_-]/g, (ch) => `u${ch.charCodeAt(0)}u`);

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
  hasCheckbox = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>('');
  const [focusedItemIndex, setFocusedItemIndex] = React.useState<number | null>(null);
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const textInputRef = React.useRef<HTMLInputElement>();
  const generatedInstanceId = React.useId().replace(/:/g, '');
  const instanceId = id ?? `multi-select-${generatedInstanceId}`;
  const listboxId = `${instanceId}-listbox`;
  const createOptionElementId = (optionId: number | string) =>
    `${instanceId}-option-${encodeOptionIdForDom(optionId)}`;

  const getModalDialog = () => textInputRef.current?.closest<HTMLElement>('[role="dialog"]');

  const selectGroups = React.useMemo(
    () =>
      groupedValues
        .map((g) => ({
          ...g,
          values: filterFunction(inputValue, g.values),
        }))
        .filter((g) => g.values.length),
    [filterFunction, groupedValues, inputValue],
  );

  const groupOptions = React.useMemo(
    () => selectGroups.reduce<SelectionOptions[]>((acc, g) => acc.concat(g.values), []),
    [selectGroups],
  );

  const selectOptions = React.useMemo(
    () => filterFunction(inputValue, value),
    [filterFunction, inputValue, value],
  );

  const allValues = React.useMemo(() => {
    const options: SelectionOptions[] = [];
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
        name: inputValueTrim,
        selected: false,
      };
    }
    return undefined;
  }, [inputValue, isCreatable, allValues]);

  const createOptionDisplayName = createOption
    ? typeof createOptionMessage === 'string'
      ? createOptionMessage
      : createOptionMessage(createOption.name)
    : undefined;

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

  const visibleIndexById = React.useMemo(() => {
    const map = new Map<string | number, number>();
    visibleOptions.forEach((option, index) => map.set(option.id, index));
    return map;
  }, [visibleOptions]);

  const selected = React.useMemo(() => allOptions.filter((v) => v.selected), [allOptions]);

  const resetActiveAndFocusedItem = () => {
    setFocusedItemIndex(null);
    setActiveItemId(null);
  };

  const setActiveAndFocusedItem = (itemIndex: number) => {
    const focusedItem = visibleOptions[itemIndex];
    setFocusedItemIndex(itemIndex);
    setActiveItemId(createOptionElementId(focusedItem.id));
  };

  const openMenu = (focusFirstOption = false) => {
    setIsOpen(true);
    if (focusFirstOption && visibleOptions.length > 0) {
      setActiveAndFocusedItem(0);
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    setInputValue('');
    resetActiveAndFocusedItem();
  };

  React.useEffect(() => {
    if (inputValue) {
      setIsOpen(true);
    }
  }, [inputValue]);

  // Modal boxes use overflow:auto; unlock while open so the portaled menu is not clipped.
  React.useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    const dialog = getModalDialog();
    if (!dialog) {
      return;
    }
    const previousOverflow = dialog.style.overflow;
    dialog.style.overflow = 'visible';
    return () => {
      dialog.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleMenuArrowKeys = (key: string) => {
    if (!isOpen) {
      setIsOpen(true);
    }

    const optionsLength = visibleOptions.length;
    if (optionsLength === 0) {
      return;
    }

    let indexToFocus = 0;

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

    setActiveAndFocusedItem(indexToFocus);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const focusedItem = focusedItemIndex !== null ? visibleOptions[focusedItemIndex] : null;
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (isOpen && focusedItem) {
          onSelect(focusedItem);
        }
        if (!isOpen) {
          openMenu(true);
        }
        break;
      case 'Tab':
      case 'Escape':
        closeMenu();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        handleMenuArrowKeys(event.key);
        break;
      default:
        break;
    }
  };

  const onToggleClick = () => {
    if (!isOpen) {
      openMenu(true);
    } else {
      closeMenu();
    }
    setTimeout(() => textInputRef.current?.focus(), 100);
  };

  const onTextInputChange = (_event: React.FormEvent<HTMLInputElement>, valueOfInput: string) => {
    setInputValue(valueOfInput);
    resetActiveAndFocusedItem();
  };

  const onSelect = (menuItem?: SelectionOptions) => {
    if (menuItem) {
      setValue(
        allOptions.map((option) =>
          option.id === menuItem.id ? { ...option, selected: !option.selected } : option,
        ),
      );
      setInputValue('');
      resetActiveAndFocusedItem();
    }
    textInputRef.current?.focus();
  };

  const noSelectedItems = allOptions.filter((option) => option.selected).length === 0;

  const getOptionTestId = (name: string) => `select-multi-typeahead-${name.replace(/\s+/g, '-')}`;

  const renderSelectOption = (option: SelectionOptions, children?: React.ReactNode) => (
    <SelectOption
      key={String(option.id)}
      id={createOptionElementId(option.id)}
      hasCheckbox={hasCheckbox}
      isFocused={focusedItemIndex === visibleIndexById.get(option.id)}
      data-testid={getOptionTestId(option.name)}
      value={option.id}
      isSelected={option.selected}
      description={option.description}
      isAriaDisabled={option.isAriaDisabled}
      ref={null}
    >
      {children ?? option.name}
    </SelectOption>
  );

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
          placeholder={placeholder}
          aria-label={ariaLabel}
          {...(activeItemId && { 'aria-activedescendant': activeItemId })}
          role="combobox"
          isExpanded={isOpen}
          aria-controls={listboxId}
        >
          <LabelGroup aria-label="Current selections">
            {selected.map((selection, index) => (
              <Label
                variant={isDisabled ? 'filled' : 'outline'}
                key={index}
                closeBtnProps={{ isDisabled }}
                onClose={(ev) => {
                  ev.stopPropagation();
                  if (!isDisabled) {
                    onSelect(selection);
                  }
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
                resetActiveAndFocusedItem();
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
        onOpenChange={(open) => {
          if (!open) {
            closeMenu();
          }
        }}
        toggle={toggle}
        variant="typeahead"
        popperProps={{
          // Portal into the modal dialog (not document.body) so VoiceOver can reach options
          // inside aria-modal; overflow unlock above lets the menu extend past the dialog edge.
          appendTo: () => getModalDialog() ?? document.body,
          ...popperProps,
        }}
      >
        <SelectList
          isAriaMultiselectable
          id={listboxId}
          {...(listTestId ? { 'data-testid': listTestId } : {})}
        >
          {createOption && isCreateOptionOnTop && groupOptions.length > 0
            ? renderSelectOption(createOption, createOptionDisplayName)
            : null}
          {!createOption && visibleOptions.length === 0 && inputValue ? (
            <SelectOption isDisabled>No results found</SelectOption>
          ) : null}
          {selectGroups.map((g, index) => (
            <React.Fragment key={g.id}>
              <SelectGroup label={g.name}>
                {g.values.map((option) => renderSelectOption(option))}
              </SelectGroup>
              {index < selectGroups.length - 1 || selectOptions.length > 0 ? <Divider /> : null}
            </React.Fragment>
          ))}
          {selectOptions.length > 0 ||
          (createOption && (!isCreateOptionOnTop || groupOptions.length === 0)) ? (
            <>
              {createOption && isCreateOptionOnTop && groupOptions.length === 0
                ? renderSelectOption(createOption, createOptionDisplayName)
                : null}
              {selectOptions.map((option) => renderSelectOption(option))}
              {createOption && !isCreateOptionOnTop
                ? renderSelectOption(createOption, createOptionDisplayName)
                : null}
            </>
          ) : null}
        </SelectList>
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
