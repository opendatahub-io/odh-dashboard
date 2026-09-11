import React from 'react';
import {
  /**
   * The Select component is used to build another generic component here
   */
  // eslint-disable-next-line no-restricted-imports
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
  FormHelperText,
  HelperTextItem,
  HelperText,
  FlexItem,
  Flex,
  SelectGroup,
  Divider,
} from '@patternfly/react-core';
import { TimesIcon, AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import TruncatedText from './TruncatedText';

export interface TypeaheadSelectOption extends Omit<SelectOptionProps, 'content' | 'isSelected'> {
  /** Content of the select option. */
  content: string | number;
  /** Value of the select option. */
  value: string | number;
  /** Indicator for option being selected */
  isSelected?: boolean;
  dropdownLabel?: React.ReactNode;
  selectedLabel?: React.ReactNode;
  group?: string;
  /** Internal marker used to ensure the creatable option can be rendered first even with groups */
  isCreateOption?: boolean;
  /** Internal marker for collapsible group header rows — not a selectable public value */
  isGroupToggle?: boolean;
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
  /**
   * Controls how we decide whether the "create" option should be shown.
   *
   * When true, the create option is hidden only if the current input exactly matches an existing
   * option (case-sensitive, after trimming).
   *
   * When false (default), the check is case-insensitive (after trimming).
   */
  isCreateOptionExactMatchCaseSensitive?: boolean;
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
  /** Flag to indicate if the selection is required or not */
  isRequired?: boolean;
  /** Test id of the toggle */
  dataTestId?: string;
  /** Flag to indicate if showing the description under the toggle */
  previewDescription?: boolean;
  /** Optional icon rendered inside the text input */
  inputIcon?: React.ReactNode;
  /**
   * When the total number of grouped options reaches this threshold the groups
   * become collapsible and start in a collapsed state.  Below the threshold
   * groups are rendered as plain (non-interactive) SelectGroup headers.
   */
  collapsibleGroupsThreshold?: number;
}

const defaultNoOptionsFoundMessage = (filter: string) => `No results found for "${filter}"`;
const defaultCreateOptionMessage = (newValue: string) => `Create "${newValue}"`;
const defaultFilterFunction = (filterValue: string, options: TypeaheadSelectOption[]) =>
  options.filter((o) => String(o.content).toLowerCase().includes(filterValue.toLowerCase()));

const createGroupToggleOption = (groupName: string): TypeaheadSelectOption => ({
  // PF requires a value; selection is gated by isGroupToggle, not by this string.
  value: `typeahead-group-toggle:${groupName}`,
  content: groupName,
  isGroupToggle: true,
});

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
  isCreateOptionExactMatchCaseSensitive = false,
  createOptionMessage = defaultCreateOptionMessage,
  isDisabled,
  toggleWidth,
  toggleProps,
  isRequired = true,
  previewDescription = true,
  dataTestId,
  inputIcon,
  collapsibleGroupsThreshold,
  maxMenuHeight,
  ...props
}: TypeaheadSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState<string>('');
  const [isFiltering, setIsFiltering] = React.useState<boolean>(false);
  const [focusedItemIndex, setFocusedItemIndex] = React.useState<number | null>(null);
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const textInputRef = React.useRef<HTMLInputElement>();

  // Collapsible-group state — only active when total grouped options >= threshold
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());
  const hasAutoCollapsed = React.useRef(false);

  // Auto-collapse all groups the first time the grouped option count reaches the threshold
  React.useEffect(() => {
    if (!hasAutoCollapsed.current && collapsibleGroupsThreshold !== undefined) {
      const groupedCount = selectOptions.filter((o) => !!o.group).length;
      if (groupedCount >= collapsibleGroupsThreshold) {
        hasAutoCollapsed.current = true;
        const groups = new Set<string>();
        selectOptions.forEach((o) => {
          if (o.group) {
            groups.add(o.group);
          }
        });
        setCollapsedGroups(groups);
      }
    }
  }, [selectOptions, collapsibleGroupsThreshold]);

  const isCollapsible =
    collapsibleGroupsThreshold !== undefined &&
    selectOptions.filter((o) => !!o.group).length >= collapsibleGroupsThreshold;

  const toggleGroup = React.useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

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

      const trimmedFilterValue = filterValue.trim();
      const normalizedFilterValue = isCreateOptionExactMatchCaseSensitive
        ? trimmedFilterValue
        : trimmedFilterValue.toLowerCase();
      const hasExactMatch = newSelectOptions.some((o) => {
        const contentRaw = String(o.content).trim();
        const valueRaw = String(o.value).trim();
        const content = isCreateOptionExactMatchCaseSensitive
          ? contentRaw
          : contentRaw.toLowerCase();
        const value = isCreateOptionExactMatchCaseSensitive ? valueRaw : valueRaw.toLowerCase();
        return content === normalizedFilterValue || value === normalizedFilterValue;
      });

      if (isCreatable && normalizedFilterValue && !hasExactMatch) {
        const createOption = {
          content:
            typeof createOptionMessage === 'string'
              ? createOptionMessage
              : createOptionMessage(filterValue),
          value: filterValue,
          isCreateOption: true,
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
    isCreateOptionExactMatchCaseSensitive,
    createOptionMessage,
    noOptionsAvailableMessage,
  ]);

  const groupedSelections = React.useMemo(() => {
    const group: Record<string, TypeaheadSelectOption[]> = {};
    const noGroup: TypeaheadSelectOption[] = [];

    filteredSelections.forEach((option) => {
      if (option.group) {
        if (option.group in group) {
          group[option.group].push(option);
        } else {
          group[option.group] = [option];
        }
      } else {
        noGroup.push(option);
      }
    });

    return { group, noGroup };
  }, [filteredSelections]);

  const isGroupCollapsed = React.useCallback(
    (group: string) => isCollapsible && !(isFiltering && filterValue) && collapsedGroups.has(group),
    [isCollapsible, isFiltering, filterValue, collapsedGroups],
  );

  const visibleMenuItems = React.useMemo((): TypeaheadSelectOption[] => {
    const items: TypeaheadSelectOption[] = [];

    if (isCreateOptionOnTop) {
      const createOpt = groupedSelections.noGroup.find((o) => o.isCreateOption);
      if (createOpt) {
        items.push(createOpt);
      }
    }

    Object.entries(groupedSelections.group).forEach(([groupName, groupOptions]) => {
      if (isCollapsible) {
        items.push(createGroupToggleOption(groupName));
        if (!isGroupCollapsed(groupName)) {
          items.push(...groupOptions);
        }
      } else {
        items.push(...groupOptions);
      }
    });

    const ungrouped = isCreateOptionOnTop
      ? groupedSelections.noGroup.filter((o) => !o.isCreateOption)
      : groupedSelections.noGroup;
    items.push(...ungrouped);

    return items;
  }, [groupedSelections, isCollapsible, isCreateOptionOnTop, isGroupCollapsed]);

  React.useEffect(() => {
    if (isFiltering) {
      openMenu();
    }
    // Don't update on openMenu changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFiltering]);

  const setActiveAndFocusedItem = (itemIndex: number) => {
    setFocusedItemIndex(itemIndex);
    const focusedItem = visibleMenuItems[itemIndex];
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

  const notAllowEmpty = !isCreatable && isRequired;
  const isToggleDisabled = isDisabled || (selectOptions.length <= 1 && notAllowEmpty);
  // Only when the field is required, not creatable and there is one option, we auto select the first option
  const isSingleOption = selectOptions.length === 1 && notAllowEmpty;
  const singleOptionValue = isSingleOption ? selectOptions[0].value : null;
  // If there is only one option, call the onChange function (unless already selected)
  React.useEffect(() => {
    if (singleOptionValue && onSelect && props.selected !== singleOptionValue) {
      onSelect(undefined, singleOptionValue);
    }
    // We don't want the callback function to be a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleOptionValue]);

  const handleSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    const menuItem = value ? visibleMenuItems.find((option) => option.value === value) : undefined;
    if (menuItem?.isGroupToggle) {
      return;
    }

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

    resetActiveAndFocusedItem();
  };

  const handleMenuArrowKeys = (key: string) => {
    let indexToFocus = 0;

    openMenu();

    if (filteredSelections.every((option) => option.isDisabled)) {
      return;
    }

    const navigableItems = visibleMenuItems.filter(
      (option) => !option.isDisabled && !option.isAriaDisabled,
    );
    if (!navigableItems.length) {
      return;
    }

    const currentValue =
      focusedItemIndex !== null ? visibleMenuItems[focusedItemIndex]?.value : undefined;
    const currentNavIndex = navigableItems.findIndex((option) => option.value === currentValue);

    if (key === 'ArrowUp') {
      const nextNavIndex = currentNavIndex <= 0 ? navigableItems.length - 1 : currentNavIndex - 1;
      indexToFocus = visibleMenuItems.findIndex(
        (option) => option.value === navigableItems[nextNavIndex].value,
      );
    }

    if (key === 'ArrowDown') {
      const nextNavIndex =
        currentNavIndex === -1 || currentNavIndex === navigableItems.length - 1
          ? 0
          : currentNavIndex + 1;
      indexToFocus = visibleMenuItems.findIndex(
        (option) => option.value === navigableItems[nextNavIndex].value,
      );
    }

    setActiveAndFocusedItem(indexToFocus);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const focusedItem = focusedItemIndex !== null ? visibleMenuItems[focusedItemIndex] : null;

    switch (event.key) {
      case 'Enter':
        if (
          isOpen &&
          focusedItem &&
          focusedItem.value !== NO_RESULTS &&
          !focusedItem.isAriaDisabled
        ) {
          if (focusedItem.isGroupToggle) {
            event.preventDefault();
            toggleGroup(String(focusedItem.content));
            break;
          }
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
      data-testid={dataTestId ?? 'typeahead-menu-toggle'}
      onClick={onToggleClick}
      isExpanded={isOpen}
      isFullWidth
      style={{ width: toggleWidth }}
      {...toggleProps}
      isDisabled={isToggleDisabled}
    >
      <TextInputGroup isPlain isDisabled={isToggleDisabled}>
        <Flex alignItems={{ default: 'alignItemsCenter' }} style={{ width: '100%' }}>
          <FlexItem style={{ flex: 1 }}>
            <TextInputGroupMain
              value={isFiltering ? filterValue : selected?.content ?? ''}
              onClick={onInputClick}
              onChange={onTextInputChange}
              onKeyDown={onInputKeyDown}
              autoComplete="off"
              innerRef={textInputRef}
              placeholder={placeholder}
              icon={inputIcon}
              {...(activeItemId && { 'aria-activedescendant': activeItemId })}
              role="combobox"
              isExpanded={isOpen}
              className="pf-v6-u-w-100"
            />
          </FlexItem>
          {selected && selected.selectedLabel && <FlexItem>{selected.selectedLabel}</FlexItem>}
          {((isFiltering && filterValue) || (allowClear && selected)) && !isToggleDisabled ? (
            <FlexItem>
              <TextInputGroupUtilities>
                <Button
                  icon={<TimesIcon aria-hidden />}
                  variant="plain"
                  onClick={onClearButtonClick}
                  aria-label="Clear input value"
                />
              </TextInputGroupUtilities>
            </FlexItem>
          ) : null}
        </Flex>
      </TextInputGroup>
    </MenuToggle>
  );

  const tSelectOption = (option: TypeaheadSelectOption, index: number) => {
    const { content, value, dropdownLabel, ...optionProps } = option;
    return (
      <SelectOption
        key={value}
        value={value}
        isFocused={focusedItemIndex === index}
        {...optionProps}
      >
        {dropdownLabel ? (
          <Flex>
            <FlexItem>{content}</FlexItem>
            <FlexItem>{dropdownLabel}</FlexItem>
          </Flex>
        ) : (
          content
        )}
      </SelectOption>
    );
  };

  const tGroupOption = (
    group: string,
    groupOptions: TypeaheadSelectOption[],
    optionIdx: number,
    addDivider: boolean,
  ): { node: React.ReactNode; nextIndex: number } => {
    let index = optionIdx;
    const testId = `typeahead-group-${group
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[()]/g, '')}`;
    const groupCollapsed = isGroupCollapsed(group);

    if (isCollapsible) {
      const toggleIndex = index++;
      const toggleOption = createGroupToggleOption(group);
      const renderedOptions = groupCollapsed
        ? []
        : groupOptions.map((opt) => tSelectOption(opt, index++));
      return {
        node: (
          <>
            <SelectOption
              key={`${group}-toggle`}
              value={toggleOption.value}
              data-testid={`${testId}-toggle`}
              isFocused={focusedItemIndex === toggleIndex}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleGroup(group);
              }}
              icon={groupCollapsed ? <AngleRightIcon /> : <AngleDownIcon />}
            >
              {group}
            </SelectOption>
            {renderedOptions}
            {addDivider && <Divider key={`${group}-divider`} />}
          </>
        ),
        nextIndex: index,
      };
    }

    const renderedOptions = groupOptions.map((opt) => tSelectOption(opt, index++));
    return {
      node: (
        <>
          <SelectGroup key={group} label={group} data-testid={testId}>
            {renderedOptions}
          </SelectGroup>
          {addDivider && <Divider key={`${group}-divider`} />}
        </>
      ),
      nextIndex: index,
    };
  };

  const renderOptions = (): React.ReactNode => {
    let idx = 0;

    // If requested, force the creatable option to render first (even when the rest is grouped).
    const createOption = isCreateOptionOnTop
      ? groupedSelections.noGroup.find((o) => o.isCreateOption)
      : undefined;
    const ungroupedSelections = isCreateOptionOnTop
      ? groupedSelections.noGroup.filter((o) => !o.isCreateOption)
      : groupedSelections.noGroup;

    const createNode = createOption ? tSelectOption(createOption, idx++) : null;
    const groupEntries = Object.entries(groupedSelections.group);
    const groupOpts = groupEntries.map(([groupName, group], groupIndex) => {
      const { node, nextIndex } = tGroupOption(
        groupName,
        group,
        idx,
        groupIndex !== groupEntries.length - 1,
      );
      idx = nextIndex;
      return <React.Fragment key={groupName}>{node}</React.Fragment>;
    });
    const selectOpts = ungroupedSelections.map((opt) => tSelectOption(opt, idx++));

    const hasGroups = groupOpts.length > 0;
    const hasUngrouped = selectOpts.length > 0;
    const hasCreate = !!createNode;

    // Divider rules:
    // - If create is present and there are groups, show divider between create and the first group.
    // - Show divider between groups/create and ungrouped options, if ungrouped options exist.
    const showDividerAfterCreate = hasCreate && hasGroups;
    const showDividerBeforeUngrouped = hasUngrouped && (hasCreate || hasGroups);
    return (
      <>
        {createNode}
        {showDividerAfterCreate ? <Divider key="typeahead-divider-after-create" /> : null}
        {groupOpts}
        {showDividerBeforeUngrouped ? <Divider key="typeahead-divider-before-ungrouped" /> : null}
        {selectOpts}
      </>
    );
  };

  return (
    <>
      <Select
        isOpen={isOpen}
        selected={selected}
        onSelect={handleSelect}
        onOpenChange={(open) => !open && closeMenu()}
        toggle={toggle}
        shouldFocusFirstItemOnOpen={false}
        {...(maxMenuHeight !== undefined ? { maxMenuHeight } : {})}
        ref={innerRef}
        {...props}
      >
        <SelectList>{renderOptions()}</SelectList>
      </Select>
      {previewDescription && isSingleOption && selected?.description ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              <TruncatedText maxLines={2} content={selected.description} />
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </>
  );
};

export default TypeaheadSelect;
