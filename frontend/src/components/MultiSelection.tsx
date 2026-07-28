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
import {
  resolveSelectPopperAppendTo,
  useModalOverflowUnlock,
} from '#~/utilities/useModalOverflowUnlock';

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
  ariaLabel?: string;
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

/** Encode option ids for stable, injective DOM id segments (e.g. 'a b' vs 'a-b', 'core/pods' vs 'coreu47upods'). */
const encodeOptionIdForDom = (optionId: number | string): string =>
  String(optionId)
    .replace(/u/g, 'uu')
    .replace(/[^a-zA-Z0-9_-]/g, (ch) => `u${ch.charCodeAt(0)}u`);

const createOptionElementId = (instanceId: string, optionId: number | string): string =>
  `${instanceId}-option-${encodeOptionIdForDom(optionId)}`;

const normalizeOptionId = (optionId: number | string): string => String(optionId);

const getOptionTestId = (name: string) =>
  `select-multi-typeahead-${name.replace(/[^a-zA-Z0-9]+/g, '-')}`;

type MultiSelectionOptionProps = {
  option: SelectionOptions;
  children?: React.ReactNode;
  showCheckbox?: boolean;
  hasCheckbox: boolean;
  isFocused: boolean;
  instanceId: string;
};

const MultiSelectionOption: React.FC<MultiSelectionOptionProps> = ({
  option,
  children,
  showCheckbox = true,
  hasCheckbox,
  isFocused,
  instanceId,
}) => (
  <SelectOption
    id={createOptionElementId(instanceId, option.id)}
    {...(showCheckbox && hasCheckbox ? { hasCheckbox: true } : {})}
    isFocused={isFocused}
    data-testid={getOptionTestId(option.name)}
    value={option.id}
    isSelected={option.selected}
    description={option.description}
    isDisabled={option.isDisabled}
    isAriaDisabled={option.isAriaDisabled}
  >
    {children ?? option.name}
  </SelectOption>
);

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
  const textInputRef = React.useRef<HTMLInputElement | null>(null);
  const focusTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>();
  const generatedInstanceId = React.useId().replace(/:/g, '');
  const instanceId = id ?? `multi-select-${generatedInstanceId}`;
  const listboxId = `${instanceId}-listbox`;
  const selectionErrorId = `${instanceId}-selection-error`;

  useModalOverflowUnlock(isOpen, textInputRef);

  const getPopperAppendTo = React.useCallback(
    () => resolveSelectPopperAppendTo(textInputRef.current),
    [],
  );

  const mergedPopperProps = React.useMemo(
    () => ({
      ...popperProps,
      appendTo: popperProps?.appendTo ?? getPopperAppendTo,
    }),
    [popperProps, getPopperAppendTo],
  );

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
      !allValues.find(
        (o) =>
          String(o.name).toLowerCase() === inputValueTrim.toLowerCase() ||
          String(o.id).toLowerCase() === inputValueTrim.toLowerCase(),
      )
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

  const selected = React.useMemo(() => allOptions.filter((v) => v.selected), [allOptions]);

  const isOptionKeyboardNavigable = (option: SelectionOptions) => !option.isDisabled;

  const getNextFocusableIndex = (
    startIndex: number | null,
    direction: 'up' | 'down',
  ): number | null => {
    const optionsLength = visibleOptions.length;
    if (optionsLength === 0) {
      return null;
    }

    let index = startIndex ?? (direction === 'down' ? -1 : optionsLength);
    for (let step = 0; step < optionsLength; step += 1) {
      index =
        direction === 'down'
          ? (index + 1) % optionsLength
          : (index - 1 + optionsLength) % optionsLength;
      if (isOptionKeyboardNavigable(visibleOptions[index])) {
        return index;
      }
    }
    return null;
  };

  const resetActiveAndFocusedItem = () => {
    setFocusedItemIndex(null);
    setActiveItemId(null);
  };

  const setActiveAndFocusedItem = (itemIndex: number) => {
    const focusedItem = visibleOptions[itemIndex];
    setFocusedItemIndex(itemIndex);
    setActiveItemId(createOptionElementId(instanceId, focusedItem.id));
  };

  const openMenu = (focusFirstOption = false) => {
    setIsOpen(true);
    if (focusFirstOption) {
      const firstFocusableIndex = getNextFocusableIndex(null, 'down');
      if (firstFocusableIndex !== null) {
        setActiveAndFocusedItem(firstFocusableIndex);
      }
    }
  };

  const closeMenu = () => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = undefined;
    }
    setIsOpen(false);
    setInputValue('');
    resetActiveAndFocusedItem();
  };

  React.useEffect(
    () => () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    },
    [],
  );

  const handleMenuArrowKeys = (key: string) => {
    if (!isOpen) {
      setIsOpen(true);
    }

    const optionsLength = visibleOptions.length;
    if (optionsLength === 0) {
      return;
    }

    if (key !== 'ArrowUp' && key !== 'ArrowDown') {
      return;
    }

    const direction = key === 'ArrowDown' ? 'down' : 'up';
    const indexToFocus = getNextFocusableIndex(focusedItemIndex, direction);
    if (indexToFocus !== null) {
      setActiveAndFocusedItem(indexToFocus);
    }
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const focusedItem = focusedItemIndex !== null ? visibleOptions[focusedItemIndex] : null;
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (isOpen && focusedItem && !focusedItem.isAriaDisabled && !focusedItem.isDisabled) {
          onSelect(focusedItem);
        }
        if (!isOpen) {
          openMenu(true);
        }
        break;
      case 'Tab':
        closeMenu();
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          event.stopPropagation();
          closeMenu();
        }
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
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      textInputRef.current?.focus();
      focusTimeoutRef.current = undefined;
    }, 100);
  };

  const onTextInputChange = (_event: React.FormEvent<HTMLInputElement>, valueOfInput: string) => {
    setInputValue(valueOfInput);
    if (valueOfInput) {
      setIsOpen(true);
    }
    resetActiveAndFocusedItem();
  };

  const persistOptions = (options: SelectionOptions[]): SelectionOptions[] => {
    if (!createOption) {
      return options;
    }
    return options.filter(
      (option) =>
        normalizeOptionId(option.id) !== normalizeOptionId(createOption.id) || option.selected,
    );
  };

  const onSelect = (menuItem?: SelectionOptions) => {
    if (menuItem?.isAriaDisabled || menuItem?.isDisabled) {
      return;
    }
    if (menuItem) {
      setValue(
        persistOptions(
          allOptions.map((option) =>
            normalizeOptionId(option.id) === normalizeOptionId(menuItem.id)
              ? { ...option, selected: !option.selected }
              : option,
          ),
        ),
      );
      setInputValue('');
      resetActiveAndFocusedItem();
    }
    textInputRef.current?.focus();
  };

  const showSelectionError = selectionRequired && selected.length === 0;

  const renderSelectOption = (
    option: SelectionOptions,
    children?: React.ReactNode,
    showCheckbox = true,
  ) => {
    const optionVisibleIndex = visibleOptions.indexOf(option);
    return (
      <MultiSelectionOption
        key={normalizeOptionId(option.id)}
        option={option}
        hasCheckbox={hasCheckbox}
        isFocused={focusedItemIndex === optionVisibleIndex}
        instanceId={instanceId}
        showCheckbox={showCheckbox}
      >
        {children}
      </MultiSelectionOption>
    );
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      id={toggleId}
      data-testid={toggleTestId}
      variant="typeahead"
      status={selectionRequired && selected.length === 0 ? 'danger' : undefined}
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
          onClick={(event) => {
            event.stopPropagation();
            if (!isOpen) {
              openMenu(false);
            }
          }}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
          innerRef={textInputRef}
          placeholder={placeholder}
          aria-label={ariaLabel}
          {...(activeItemId && { 'aria-activedescendant': activeItemId })}
          inputProps={{
            'aria-haspopup': 'listbox',
            ...(showSelectionError && {
              'aria-describedby': selectionErrorId,
              'aria-invalid': true,
            }),
          }}
          role="combobox"
          isExpanded={isOpen}
          aria-controls={listboxId}
        >
          <LabelGroup aria-label="Current selections">
            {selected.map((selection) => (
              <Label
                variant={isDisabled ? 'filled' : 'outline'}
                key={normalizeOptionId(selection.id)}
                closeBtnProps={{
                  isDisabled,
                  'aria-label': `Remove ${selection.name}`,
                }}
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
          {selected.length > 0 ? (
            <Button
              icon={<TimesIcon aria-hidden />}
              variant="plain"
              onClick={() => {
                setInputValue('');
                resetActiveAndFocusedItem();
                setValue(
                  persistOptions(allOptions.map((option) => ({ ...option, selected: false }))),
                );
                textInputRef.current?.focus();
              }}
              aria-label="Clear all selections"
            />
          ) : null}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <>
      <div
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="additions text"
        className="pf-v6-u-screen-reader"
      >
        {isOpen && visibleOptions.length === 0 ? 'No results found' : ''}
      </div>
      <Select
        isScrollable={isScrollable}
        id={id}
        isOpen={isOpen}
        selected={selected}
        onSelect={(ev, selection) => {
          const selectedOption = allOptions.find(
            (option) => normalizeOptionId(option.id) === normalizeOptionId(selection),
          );
          onSelect(selectedOption);
        }}
        onOpenChange={(open) => {
          if (!open) {
            closeMenu();
          }
        }}
        toggle={toggle}
        variant="typeahead"
        popperProps={mergedPopperProps}
      >
        {/* Single SelectList id for aria-controls; SelectGroup inside matches TypeaheadSelect. */}
        <SelectList
          isAriaMultiselectable
          id={listboxId}
          aria-label={ariaLabel}
          {...(listTestId ? { 'data-testid': listTestId } : {})}
        >
          {createOption && isCreateOptionOnTop && groupOptions.length > 0
            ? renderSelectOption(createOption, createOptionDisplayName, false)
            : null}
          {!createOption && visibleOptions.length === 0 ? (
            <SelectOption isDisabled aria-hidden="true">
              No results found
            </SelectOption>
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
                ? renderSelectOption(createOption, createOptionDisplayName, false)
                : null}
              {selectOptions.map((option) => renderSelectOption(option))}
              {createOption && !isCreateOptionOnTop
                ? renderSelectOption(createOption, createOptionDisplayName, false)
                : null}
            </>
          ) : null}
        </SelectList>
      </Select>
      {showSelectionError && (
        <HelperText isLiveRegion>
          <HelperTextItem
            variant="error"
            id={selectionErrorId}
            data-testid="group-selection-error-text"
          >
            {noSelectedOptionsMessage}
          </HelperTextItem>
        </HelperText>
      )}
    </>
  );
};
