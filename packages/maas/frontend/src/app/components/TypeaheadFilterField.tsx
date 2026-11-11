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
  // A committed fragment (or a navigation-initialized display name) has no
  // option with a matching resource value; synthesize one so it stays visible
  // in the toggle and can be cleared like a regular selection.
  const selectOptions = React.useMemo(
    () =>
      value && !options.some((o) => String(o.value) === value)
        ? [...options, { value, content: value }]
        : options,
    [options, value],
  );

  return (
    <TypeaheadSelect
      selectOptions={selectOptions}
      selected={value}
      onSelect={(_event, selection) => {
        // Resolve against the original options only: a synthetic fragment
        // option must keep fragment semantics (no label) when reselected,
        // instead of turning into an exact resource selection.
        const option = options.find((o) => String(o.value) === String(selection));
        onChange(String(selection), option ? String(option.content) : undefined);
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
