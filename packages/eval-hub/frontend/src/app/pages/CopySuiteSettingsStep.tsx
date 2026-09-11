import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  Label,
  LabelGroup,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  TextArea,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  TextInput,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { Controller, useFormContext, type Control } from 'react-hook-form';
import BenchmarkThresholdField from '~/app/components/BenchmarkThresholdField';
import { formatCollectionMetadataValue } from '~/app/components/benchmarkUtils';
import { COLLECTION_METADATA_OPTIONS, SUITE_EVALUATES_MENU_OPTIONS } from '~/app/pages/const';
import type { CopySuiteFormValues } from '~/app/schemas/copySuite.schema';

type CopySuiteSettingsStepProps = {
  onNext: () => void;
  onCancel: () => void;
};

type CollectionMetadataFieldName =
  'suiteEvaluates' | 'suiteDomains' | 'suiteTasks' | 'suiteModalities' | 'suiteIndustries';

type CollectionMetadataFieldProps = {
  name: CollectionMetadataFieldName;
  label: string;
  emptySelectionLabel?: string;
  fieldId: string;
  testId: string;
  options: readonly string[];
};

type CollectionMetadataTypeaheadFieldProps = {
  control: Control<CopySuiteFormValues>;
  name: CollectionMetadataFieldName;
  label: string;
  emptySelectionLabel?: string;
  fieldId: string;
  testId: string;
  options: readonly string[];
};

const CollectionMetadataTypeaheadField: React.FC<CollectionMetadataTypeaheadFieldProps> = ({
  control,
  name,
  label,
  emptySelectionLabel,
  fieldId,
  testId,
  options,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [focusedOptionIndex, setFocusedOptionIndex] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = `${fieldId}-listbox`;

  const filteredOptions = React.useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return options.filter((option) => {
      const formattedOption = formatCollectionMetadataValue(option).toLowerCase();
      return (
        option.toLowerCase().includes(normalizedSearch) ||
        formattedOption.includes(normalizedSearch)
      );
    });
  }, [options, search]);

  const resetFocusedOption = () => setFocusedOptionIndex(null);

  const getOptionId = (option: string) => `${fieldId}-option-${option}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const selected = field.value.map((value) => String(value));
        const toggleSelection = (value: string) => {
          field.onChange(
            selected.includes(value)
              ? selected.filter((item) => item !== value)
              : [...selected, value],
          );
          setSearch('');
          resetFocusedOption();
          inputRef.current?.focus();
        };

        const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
          <Select
            id={`${fieldId}-select`}
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
                resetFocusedOption();
              }
            }}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                id={`${fieldId}-toggle`}
                variant="typeahead"
                onClick={() => {
                  setIsOpen((previous) => !previous);
                  inputRef.current?.focus();
                }}
                isExpanded={isOpen}
                isFullWidth
                data-testid={`${testId}-toggle`}
              >
                <TextInputGroup isPlain>
                  <TextInputGroupMain
                    inputId={fieldId}
                    value={search}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!isOpen) {
                        setIsOpen(true);
                      }
                    }}
                    onChange={(_event, value) => {
                      setSearch(value);
                      resetFocusedOption();
                      if (!isOpen) {
                        setIsOpen(true);
                      }
                    }}
                    onKeyDown={handleInputKeyDown}
                    autoComplete="off"
                    innerRef={inputRef}
                    placeholder={
                      selected.length === 0
                        ? (emptySelectionLabel ?? `Select ${label.toLowerCase()}`)
                        : undefined
                    }
                    aria-label={label}
                    role="combobox"
                    isExpanded={isOpen}
                    aria-controls={listboxId}
                    aria-activedescendant={
                      focusedOptionIndex !== null && filteredOptions[focusedOptionIndex]
                        ? getOptionId(filteredOptions[focusedOptionIndex])
                        : undefined
                    }
                    inputProps={{ 'data-testid': `${testId}-input` }}
                  >
                    <LabelGroup aria-label="Current selections">
                      {selected.map((value) => (
                        <Label
                          key={value}
                          variant="outline"
                          data-testid={`${testId}-tag-${value}`}
                          closeBtnProps={{
                            'aria-label': `Remove ${formatCollectionMetadataValue(value)}`,
                          }}
                          onClose={(event) => {
                            event.stopPropagation();
                            toggleSelection(value);
                          }}
                        >
                          {formatCollectionMetadataValue(value)}
                        </Label>
                      ))}
                    </LabelGroup>
                  </TextInputGroupMain>
                  <TextInputGroupUtilities>
                    {selected.length > 0 ? (
                      <Button
                        variant="plain"
                        icon={<TimesIcon aria-hidden />}
                        aria-label="Clear all selections"
                        onClick={(event) => {
                          event.stopPropagation();
                          field.onChange([]);
                          setSearch('');
                          resetFocusedOption();
                          inputRef.current?.focus();
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
                    data-testid={`${testId}-option-${option}`}
                  >
                    {formatCollectionMetadataValue(option)}
                  </SelectOption>
                ))
              ) : (
                <SelectOption isDisabled>No results found</SelectOption>
              )}
            </SelectList>
          </Select>
        );
      }}
    />
  );
};

const CollectionMetadataField: React.FC<CollectionMetadataFieldProps> = (props) => {
  const { control } = useFormContext<CopySuiteFormValues>();

  return (
    <FormGroup label={props.label} fieldId={props.fieldId}>
      <CollectionMetadataTypeaheadField control={control} {...props} />
    </FormGroup>
  );
};

const CopySuiteSettingsStep: React.FC<CopySuiteSettingsStepProps> = ({ onNext, onCancel }) => {
  const { control, watch } = useFormContext<CopySuiteFormValues>();
  const suiteName = watch('suiteName');
  const isSettingsValid = suiteName.trim() !== '';

  return (
    <div
      id="copy-suite-step-content-settings"
      className="evalhub-copy-suite-page__step"
      data-testid="copy-suite-step-settings"
    >
      <Form id="copy-suite-form" style={{ maxWidth: 840 }} data-testid="copy-suite-form">
        <FormGroup label="Suite name" isRequired fieldId="suite-name">
          <Controller
            name="suiteName"
            control={control}
            render={({ field }) => (
              <TextInput
                id="suite-name"
                data-testid="suite-name-input"
                placeholder="Enter suite name"
                value={field.value}
                onChange={(_event, value) => field.onChange(value)}
                onBlur={field.onBlur}
                isRequired
              />
            )}
          />
        </FormGroup>

        <FormGroup label="Description" fieldId="suite-description">
          <Controller
            name="suiteDescription"
            control={control}
            render={({ field }) => (
              <TextArea
                id="suite-description"
                data-testid="suite-description-input"
                placeholder="Enter suite description"
                value={field.value}
                onChange={(_event, value) => field.onChange(value)}
                onBlur={field.onBlur}
                resizeOrientation="vertical"
              />
            )}
          />
        </FormGroup>

        <CollectionMetadataField
          name="suiteEvaluates"
          label="Evaluates"
          emptySelectionLabel="Select evaluation target"
          fieldId="suite-evaluates"
          testId="suite-evaluates"
          options={SUITE_EVALUATES_MENU_OPTIONS}
        />

        <CollectionMetadataField
          name="suiteDomains"
          label="Category"
          fieldId="suite-domains"
          testId="suite-domains"
          options={COLLECTION_METADATA_OPTIONS.domains}
        />

        {/* TODO: Re-enable these metadata fields when their UX is ready. */}
        {/*
        <CollectionMetadataField
          name="suiteTasks"
          label="Tasks"
          fieldId="suite-tasks"
          testId="suite-tasks"
          options={COLLECTION_METADATA_OPTIONS.tasks}
        />

        <CollectionMetadataField
          name="suiteModalities"
          label="Modalities"
          fieldId="suite-modalities"
          testId="suite-modalities"
          options={COLLECTION_METADATA_OPTIONS.modalities}
        />

        <CollectionMetadataField
          name="suiteIndustries"
          label="Industries"
          fieldId="suite-industries"
          testId="suite-industries"
          options={COLLECTION_METADATA_OPTIONS.industries}
        />
        */}

        <Controller
          name="suiteThreshold"
          control={control}
          render={({ field }) => (
            <BenchmarkThresholdField
              value={field.value}
              onChange={field.onChange}
              label="Suite threshold"
              description="Set the minimum passing score for this suite. Results below this threshold are marked as failing."
              fieldId="suite-threshold"
            />
          )}
        />
      </Form>
      <div
        id="copy-suite-settings-actions"
        className="evalhub-copy-suite-page__footer"
        data-testid="copy-suite-settings-actions"
      >
        <Button
          variant="primary"
          data-testid="copy-suite-next"
          onClick={onNext}
          isDisabled={!isSettingsValid}
        >
          Next
        </Button>
        <Button variant="link" data-testid="copy-suite-cancel" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default CopySuiteSettingsStep;
