import * as React from 'react';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';

export type TypeaheadFilterFieldProps = {
  options: TypeaheadSelectOption[];
  placeholder: string;
  testId: string;
  onChange: (value?: string, label?: string) => void;
  /** Current filter value: the selected option value or a typed text fragment. */
  value?: string;
  /** Fired when a filter is applied, either by selecting an option or committing a typed fragment. */
  onFilterApplied?: () => void;
};

/** Matches the typed filter text against the option label or its resource name. */
export const filterByLabelOrValue = (
  filterValue: string,
  options: TypeaheadSelectOption[],
): TypeaheadSelectOption[] =>
  options.filter(
    (option) =>
      String(option.content).toLowerCase().includes(filterValue.toLowerCase()) ||
      String(option.value).toLowerCase().includes(filterValue.toLowerCase()),
  );

/** Deduplicates labels by resource name and sorts them for display. */
export const toSelectOptions = (labels: Map<string, string>): TypeaheadSelectOption[] =>
  Array.from(labels.entries())
    .toSorted(([, a], [, b]) => a.localeCompare(b))
    .map(([value, content]) => ({ value, content }));

/**
 * Typeahead select for table filtering: users pick a specific value from the
 * menu or type a partial text fragment (e.g. "7B") and commit it via the
 * "Filter by" create option to match all rows containing that fragment.
 */
const TypeaheadFilterField: React.FC<TypeaheadFilterFieldProps> = ({
  options,
  placeholder,
  testId,
  onChange,
  value,
  onFilterApplied,
}) => {
  // A committed fragment has no matching option; synthesize one so it stays
  // visible in the toggle and can be cleared like a regular selection.
  const selectOptions = React.useMemo(
    () =>
      value && !options.some((o) => String(o.value) === value || String(o.content) === value)
        ? [...options, { value, content: value }]
        : options,
    [options, value],
  );

  return (
    <TypeaheadSelect
      selectOptions={selectOptions}
      selected={value}
      onSelect={(_event, selection) => {
        const option = selectOptions.find((o) => o.value === selection);
        // The create option commits the typed fragment as free text (no label)
        onChange(
          String(selection),
          option && !option.isCreateOption ? String(option.content) : undefined,
        );
        onFilterApplied?.();
      }}
      onClearSelection={() => onChange('')}
      filterFunction={filterByLabelOrValue}
      isCreatable
      createOptionMessage={(filterValue) => `Filter by "${filterValue}"`}
      allowClear
      isRequired={false}
      isScrollable
      placeholder={placeholder}
      toggleWidth="350px"
      dataTestId={testId}
    />
  );
};

export default TypeaheadFilterField;
