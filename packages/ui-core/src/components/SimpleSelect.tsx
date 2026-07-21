import * as React from 'react';
import {
  MenuToggle,
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectList,
  SelectOption,
  SelectGroup,
  Divider,
  MenuToggleProps,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Skeleton,
} from '@patternfly/react-core';
import { omit } from 'lodash-es';
import TruncatedText from './TruncatedText';
import {
  resolveSelectPopperAppendTo,
  useModalOverflowUnlock,
} from '../utilities/useModalOverflowUnlock';

import './SimpleSelect.scss';

export type SimpleSelectOption = {
  key: string;
  label: string;
  description?: React.ReactNode;
  dropdownLabel?: React.ReactNode;
  isPlaceholder?: boolean;
  isDisabled?: boolean;
  // Use aria-disabled (instead of disabled) when we still need hover/focus behavior
  // (e.g., tooltips on "disabled" options).
  isAriaDisabled?: boolean;
  isFavorited?: boolean;
  dataTestId?: string;
  optionKey?: string; // Used to differentiate the only option with the same key to trigger the one-option hook in the component
};

export type SimpleGroupSelectOption = {
  key: string;
  label: string;
  options: SimpleSelectOption[];
};

type SimpleSelectProps = {
  options?: SimpleSelectOption[];
  groupedOptions?: SimpleGroupSelectOption[];
  value?: string;
  toggleLabel?: React.ReactNode;
  placeholder?: string;
  onChange: (key: string, isPlaceholder: boolean) => void;
  isFullWidth?: boolean;
  toggleProps?: MenuToggleProps;
  isDisabled?: boolean;
  icon?: React.ReactNode;
  dataTestId?: string;
  ariaLabel?: string;
  previewDescription?: boolean;
  isSkeleton?: boolean;
  autoSelectOnlyOption?: boolean;
} & Omit<
  React.ComponentProps<typeof Select>,
  'isOpen' | 'toggle' | 'dropdownItems' | 'onChange' | 'selected'
>;

const SimpleSelect: React.FC<SimpleSelectProps> = ({
  isDisabled,
  onChange,
  options,
  groupedOptions,
  placeholder = 'Select...',
  value,
  toggleLabel,
  isFullWidth,
  icon,
  dataTestId,
  ariaLabel,
  toggleProps,
  previewDescription = true,
  popperProps,
  isSkeleton,
  autoSelectOnlyOption = true,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);
  const menuToggleRef = React.useRef<HTMLDivElement | null>(null);

  useModalOverflowUnlock(open, menuToggleRef);

  const mergedPopperProps = React.useMemo(() => {
    if (popperProps?.appendTo !== undefined) {
      return { maxWidth: 'trigger' as const, ...popperProps };
    }
    return {
      maxWidth: 'trigger' as const,
      ...popperProps,
      // Portal into the dialog only inside modals; otherwise keep PatternFly inline default.
      appendTo: () => resolveSelectPopperAppendTo(menuToggleRef.current),
    };
  }, [popperProps]);

  const groupedOptionsFlat = React.useMemo(
    () =>
      groupedOptions?.reduce<SimpleSelectOption[]>((acc, group) => [...acc, ...group.options], []),
    [groupedOptions],
  );

  const findOptionForKey = (key: string) =>
    options?.find((option) => option.key === key) || groupedOptionsFlat?.find((o) => o.key === key);

  const selectedOption = value ? findOptionForKey(value) : undefined;
  const selectedLabel = selectedOption?.label ?? placeholder;

  const totalOptions = React.useMemo(
    () => [...(options || []), ...(groupedOptionsFlat || [])],
    [options, groupedOptionsFlat],
  );

  const singleOptionKey =
    totalOptions.length === 1 ? totalOptions[0].optionKey || totalOptions[0].key : null;

  React.useEffect(() => {
    if (singleOptionKey && !isSkeleton && autoSelectOnlyOption && value !== totalOptions[0].key) {
      onChange(totalOptions[0].key, totalOptions[0].isPlaceholder ?? false);
    }
    // We don't want the callback function to be a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleOptionKey, isSkeleton, autoSelectOnlyOption, value, totalOptions]);

  if (isSkeleton) {
    return <Skeleton style={{ minWidth: 'var(--pf-t--global--spacer--3xl)' }} />;
  }

  const displayedLabel = toggleLabel ?? selectedLabel;
  const displayedLabelTitle = typeof displayedLabel === 'string' ? displayedLabel : undefined;
  const togglePropsAriaLabel = toggleProps?.['aria-label'];
  const toggleAriaLabel =
    ariaLabel ?? togglePropsAriaLabel ?? (toggleProps?.id ? undefined : 'Options menu');
  if (process.env.NODE_ENV === 'development' && !toggleAriaLabel && toggleProps?.id) {
    console.warn(
      `SimpleSelect: toggleProps.id="${toggleProps.id}" provided without ariaLabel. ` +
        `Ensure a <label htmlFor="${toggleProps.id}"> exists, or pass ariaLabel explicitly.`,
    );
  }
  const restToggleProps = omit(toggleProps ?? {}, ['onClick', 'aria-label']);

  return (
    <>
      <Select
        {...props}
        isOpen={open}
        selected={value || toggleLabel}
        onSelect={(e, selectValue) => {
          const key = String(selectValue);
          const option = findOptionForKey(key);
          if (option?.isAriaDisabled || option?.isDisabled) {
            return;
          }

          onChange(key, !!selectValue && (option?.isPlaceholder ?? false));
          setOpen(false);
        }}
        onOpenChange={setOpen}
        toggle={(toggleRef) => (
          <div ref={menuToggleRef} className="odh-simple-select__toggle-anchor">
            <MenuToggle
              innerRef={toggleRef}
              data-testid={dataTestId}
              {...(toggleAriaLabel ? { 'aria-label': toggleAriaLabel } : {})}
              onClick={() => setOpen((currentOpen) => !currentOpen)}
              icon={icon}
              isExpanded={open}
              isDisabled={
                totalOptions.length === 0 ||
                (totalOptions.length === 1 && autoSelectOnlyOption) ||
                isDisabled
              }
              isFullWidth={isFullWidth}
              {...restToggleProps}
            >
              {/* Plain text: MenuToggle's .pf-v6-c-menu-toggle__text handles truncation. Using Truncate
                  caused Safari flex layout bugs (labels clipped when space was available). */}
              <span title={displayedLabelTitle}>{displayedLabel}</span>
            </MenuToggle>
          </div>
        )}
        shouldFocusToggleOnSelect
        popperProps={mergedPopperProps}
      >
        {groupedOptions?.map((group, index) => (
          <React.Fragment key={group.key}>
            {index > 0 ? <Divider /> : null}
            <SelectGroup label={group.label}>
              <SelectList>
                {group.options.map(
                  ({
                    key,
                    optionKey,
                    label,
                    dropdownLabel,
                    description,
                    isFavorited,
                    isDisabled: optionDisabled,
                    isAriaDisabled: optionAriaDisabled,
                    dataTestId: optionDataTestId,
                  }) => (
                    <SelectOption
                      key={optionKey ?? key}
                      value={key}
                      description={<TruncatedText maxLines={2} content={description} />}
                      isDisabled={optionDisabled}
                      isAriaDisabled={optionAriaDisabled}
                      isFavorited={isFavorited}
                      data-testid={optionDataTestId || key}
                    >
                      {dropdownLabel || label}
                    </SelectOption>
                  ),
                )}
              </SelectList>
            </SelectGroup>
          </React.Fragment>
        )) ?? null}
        {options?.length ? (
          <>
            {groupedOptions?.length ? <Divider /> : null}
            <SelectList>
              {options.map(
                ({
                  key,
                  optionKey,
                  label,
                  dropdownLabel,
                  description,
                  isFavorited,
                  isDisabled: optionDisabled,
                  isAriaDisabled: optionAriaDisabled,
                  dataTestId: optionDataTestId,
                }) => (
                  <SelectOption
                    key={optionKey ?? key}
                    value={key}
                    description={<TruncatedText maxLines={2} content={description} />}
                    isFavorited={isFavorited}
                    isDisabled={optionDisabled}
                    isAriaDisabled={optionAriaDisabled}
                    data-testid={optionDataTestId || key}
                  >
                    {dropdownLabel || label}
                  </SelectOption>
                ),
              )}
            </SelectList>
          </>
        ) : null}
      </Select>
      {previewDescription && selectedOption?.description ? (
        <FormHelperText>
          <HelperText isLiveRegion>
            <HelperTextItem>
              <TruncatedText maxLines={2} content={selectedOption.description} />
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </>
  );
};

export default SimpleSelect;
