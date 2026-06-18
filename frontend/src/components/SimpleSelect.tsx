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
import TruncatedText from '#~/components/TruncatedText';

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
  previewDescription?: boolean;
  isSkeleton?: boolean;
  autoSelectOnlyOption?: boolean;
} & Omit<
  React.ComponentProps<typeof Select>,
  'isOpen' | 'toggle' | 'dropdownItems' | 'onChange' | 'selected'
>;

// Same ref-count attrs as MultiSelection so mixed selects in one modal share overflow state.
const MODAL_OVERFLOW_UNLOCK_COUNT_ATTR = 'data-multiselection-overflow-unlock-count';
const MODAL_OVERFLOW_ORIGINAL_ATTR = 'data-multiselection-overflow-original';

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
  toggleProps,
  previewDescription = true,
  popperProps,
  isSkeleton,
  autoSelectOnlyOption = true,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);
  const menuToggleRef = React.useRef<HTMLDivElement | null>(null);

  const getModalDialog = () => menuToggleRef.current?.closest<HTMLElement>('[role="dialog"]');

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
    if (singleOptionKey && !isSkeleton && autoSelectOnlyOption) {
      onChange(totalOptions[0].key, false);
    }
    // We don't want the callback function to be a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleOptionKey, isSkeleton, autoSelectOnlyOption]);

  // Modal boxes use overflow:auto; unlock while open so the portaled menu is not clipped.
  React.useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const dialog = getModalDialog();
    if (!dialog) {
      return;
    }
    const unlockCount = Number(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR) ?? '0');
    if (unlockCount === 0) {
      dialog.setAttribute(MODAL_OVERFLOW_ORIGINAL_ATTR, dialog.style.overflow);
    }
    dialog.setAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR, String(unlockCount + 1));
    dialog.style.overflow = 'visible';
    return () => {
      const currentCount = Number(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR) ?? '1');
      const nextCount = currentCount - 1;
      if (nextCount <= 0) {
        dialog.style.overflow = dialog.getAttribute(MODAL_OVERFLOW_ORIGINAL_ATTR) ?? '';
        dialog.removeAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR);
        dialog.removeAttribute(MODAL_OVERFLOW_ORIGINAL_ATTR);
      } else {
        dialog.setAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR, String(nextCount));
      }
    };
  }, [open]);

  if (isSkeleton) {
    return <Skeleton style={{ minWidth: 100 }} />;
  }

  return (
    <>
      <Select
        {...props}
        isOpen={open}
        selected={value || toggleLabel}
        onSelect={(e, selectValue) => {
          const key = String(selectValue);
          const option = findOptionForKey(key);
          if (option?.isAriaDisabled) {
            return;
          }

          onChange(key, !!selectValue && (option?.isPlaceholder ?? false));
          setOpen(false);
        }}
        onOpenChange={setOpen}
        toggle={(toggleRef) => (
          <div ref={menuToggleRef} style={{ display: 'contents' }}>
            <MenuToggle
              innerRef={toggleRef}
              data-testid={dataTestId}
              aria-label="Options menu"
              onClick={() => setOpen(!open)}
              icon={icon}
              isExpanded={open}
              isDisabled={
                totalOptions.length === 0 ||
                (totalOptions.length === 1 && autoSelectOnlyOption) ||
                isDisabled
              }
              isFullWidth={isFullWidth}
              {...toggleProps}
            >
              {/* Plain text: MenuToggle's .pf-v6-c-menu-toggle__text handles truncation. Using Truncate
                  caused Safari flex layout bugs (labels clipped when space was available). */}
              {(() => {
                const displayedLabel = toggleLabel ?? selectedLabel;
                return (
                  <span title={typeof displayedLabel === 'string' ? displayedLabel : undefined}>
                    {displayedLabel}
                  </span>
                );
              })()}
            </MenuToggle>
          </div>
        )}
        shouldFocusToggleOnSelect
        popperProps={{
          maxWidth: 'trigger',
          ...popperProps,
          // Portal into the modal dialog so VoiceOver can reach options inside aria-modal.
          appendTo: popperProps?.appendTo ?? (() => getModalDialog() ?? document.body),
        }}
      >
        {groupedOptions?.map((group, index) => (
          <React.Fragment key={group.key}>
            {index > 0 ? <Divider /> : null}
            <SelectGroup label={group.label}>
              <SelectList>
                {group.options.map(
                  ({
                    key,
                    label,
                    dropdownLabel,
                    description,
                    isFavorited,
                    isDisabled: optionDisabled,
                    isAriaDisabled: optionAriaDisabled,
                    dataTestId: optionDataTestId,
                  }) => (
                    <SelectOption
                      key={key}
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
          <SelectList>
            {groupedOptions?.length ? <Divider /> : null}
            {options.map(
              ({
                key,
                label,
                dropdownLabel,
                description,
                isFavorited,
                isDisabled: optionDisabled,
                isAriaDisabled: optionAriaDisabled,
                dataTestId: optionDataTestId,
              }) => (
                <SelectOption
                  key={key}
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
        ) : null}
      </Select>
      {previewDescription && selectedOption?.description ? (
        <FormHelperText>
          <HelperText>
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
