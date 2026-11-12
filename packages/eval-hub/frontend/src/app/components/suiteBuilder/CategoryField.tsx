import * as React from 'react';
import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { Controller, useFormContext } from 'react-hook-form';
import { formatCollectionMetadataValue } from '~/app/components/benchmarkUtils';
import type { SuiteBuilderFormValues } from '~/app/schemas/suiteBuilder.schema';
import type { Provider } from '~/app/types';

export const getCategoryOptions = (providers: Provider[]): string[] =>
  providers
    .flatMap((provider) =>
      (provider.benchmarks ?? [])
        .map((benchmark) => benchmark.category?.trim() ?? '')
        .filter((category) => category.length > 0),
    )
    .filter(
      (category, index, categories) =>
        categories.findIndex((candidate) => candidate.toLowerCase() === category.toLowerCase()) ===
        index,
    )
    .toSorted((left, right) =>
      formatCollectionMetadataValue(left).localeCompare(formatCollectionMetadataValue(right)),
    );

type CategoryFieldProps = {
  options: string[];
  isDisabled: boolean;
};

const CategoryField: React.FC<CategoryFieldProps> = ({ options, isDisabled }) => {
  const { control } = useFormContext<SuiteBuilderFormValues>();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [focusedOptionIndex, setFocusedOptionIndex] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = 'goal-suite-category-listbox';
  const filteredOptions = React.useMemo(
    () =>
      options.filter((option) => {
        const formattedOption = formatCollectionMetadataValue(option).toLowerCase();
        return (
          option.toLowerCase().includes(search.trim().toLowerCase()) ||
          formattedOption.includes(search.trim().toLowerCase())
        );
      }),
    [options, search],
  );
  const getOptionId = (category: string) =>
    `goal-suite-category-option-${encodeURIComponent(category)}`;

  return (
    <Controller
      name="suiteDomains"
      control={control}
      render={({ field, fieldState }) => {
        const selected = field.value;
        const toggleSelection = (category: string) => {
          field.onChange(
            selected.includes(category)
              ? selected.filter((value) => value !== category)
              : [...selected, category],
          );
          setSearch('');
          setFocusedOptionIndex(null);
          inputRef.current?.focus();
        };
        const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (isDisabled) {
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (isOpen && focusedOptionIndex !== null) {
              const focusedOption = filteredOptions[focusedOptionIndex];
              if (focusedOption) {
                toggleSelection(focusedOption);
              }
            } else {
              setIsOpen(true);
            }
            return;
          }

          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
            return;
          }

          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          }
          if (filteredOptions.length === 0) {
            return;
          }

          const direction = event.key === 'ArrowDown' ? 1 : -1;
          const currentIndex =
            focusedOptionIndex ?? (direction === 1 ? -1 : filteredOptions.length);
          setFocusedOptionIndex(
            (currentIndex + direction + filteredOptions.length) % filteredOptions.length,
          );
        };

        return (
          <>
            <Select
              id="goal-suite-category-select"
              role="menu"
              isOpen={isOpen}
              selected={selected}
              onSelect={(_event, value) => {
                if (typeof value === 'string') {
                  toggleSelection(value);
                }
              }}
              onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) {
                  setSearch('');
                  setFocusedOptionIndex(null);
                }
              }}
              maxMenuHeight="400px"
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  id="goal-suite-category-toggle"
                  variant="typeahead"
                  onClick={() => {
                    if (!isDisabled) {
                      setIsOpen((previous) => !previous);
                      inputRef.current?.focus();
                    }
                  }}
                  isExpanded={isOpen}
                  isFullWidth
                  isDisabled={isDisabled}
                  data-testid="goal-suite-category-toggle"
                >
                  <TextInputGroup isPlain>
                    <TextInputGroupMain
                      inputId="goal-suite-category"
                      value={search}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!isDisabled) {
                          setIsOpen(true);
                        }
                      }}
                      onChange={(_event, value) => {
                        if (isDisabled) {
                          return;
                        }
                        setSearch(value);
                        setFocusedOptionIndex(null);
                        if (!isOpen) {
                          setIsOpen(true);
                        }
                      }}
                      onKeyDown={handleInputKeyDown}
                      autoComplete="off"
                      innerRef={inputRef}
                      placeholder={selected.length === 0 ? 'Select category' : undefined}
                      aria-label="Category"
                      aria-invalid={fieldState.error ? true : undefined}
                      role="combobox"
                      isExpanded={isOpen}
                      aria-controls={listboxId}
                      aria-activedescendant={
                        focusedOptionIndex !== null && filteredOptions[focusedOptionIndex]
                          ? getOptionId(filteredOptions[focusedOptionIndex])
                          : undefined
                      }
                      inputProps={{
                        disabled: isDisabled,
                        'data-testid': 'goal-suite-category-input',
                      }}
                    >
                      <LabelGroup aria-label="Selected categories">
                        {selected.map((category) => (
                          <Label
                            key={category}
                            variant="outline"
                            data-testid={`goal-suite-category-tag-${category}`}
                            closeBtnProps={{
                              'aria-label': `Remove ${formatCollectionMetadataValue(category)}`,
                            }}
                            onClose={(event) => {
                              event.stopPropagation();
                              toggleSelection(category);
                            }}
                          >
                            {formatCollectionMetadataValue(category)}
                          </Label>
                        ))}
                      </LabelGroup>
                    </TextInputGroupMain>
                    <TextInputGroupUtilities>
                      {selected.length > 0 ? (
                        <Button
                          variant="plain"
                          icon={<TimesIcon aria-hidden />}
                          aria-label="Clear categories"
                          onClick={(event) => {
                            event.stopPropagation();
                            field.onChange([]);
                            setSearch('');
                          }}
                        />
                      ) : null}
                    </TextInputGroupUtilities>
                  </TextInputGroup>
                </MenuToggle>
              )}
              variant="typeahead"
            >
              <SelectList isAriaMultiselectable id={listboxId}>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => (
                    <SelectOption
                      key={option}
                      value={option}
                      hasCheckbox
                      isSelected={selected.includes(option)}
                      isFocused={focusedOptionIndex === index}
                      id={getOptionId(option)}
                      data-testid={`goal-suite-category-option-${option}`}
                    >
                      {formatCollectionMetadataValue(option)}
                    </SelectOption>
                  ))
                ) : (
                  <SelectOption isDisabled>No categories match your search.</SelectOption>
                )}
              </SelectList>
            </Select>
            {fieldState.error?.message ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error" data-testid="suite-builder-category-error">
                    {fieldState.error.message}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
          </>
        );
      }}
    />
  );
};

export default CategoryField;
