import * as React from 'react';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';

export type TypeaheadFilterOption = TypeaheadSelectOption & {
  /** Additional strings the typeahead search matches besides the option label and value. */
  searchAliases?: string[];
};

export type TypeaheadFilterFieldProps = {
  options: TypeaheadFilterOption[];
  placeholder: string;
  testId: string;
  onChange: (value?: string, label?: string) => void;
  /** Current filter value: the selected option value or a typed text fragment. */
  value?: string;
  /** Fired when a filter is applied, either by selecting an option or committing a typed fragment. */
  onFilterApplied?: () => void;
};

/** Matches the typed filter text against the option label, its resource name, or its search aliases. */
export const filterByLabelOrValue = (
  filterValue: string,
  options: TypeaheadFilterOption[],
): TypeaheadFilterOption[] => {
  const search = filterValue.trim().toLowerCase();
  return search
    ? options.filter(
        (option) =>
          String(option.content).toLowerCase().includes(search) ||
          String(option.value).toLowerCase().includes(search) ||
          option.searchAliases?.some((alias) => alias.toLowerCase().includes(search)),
      )
    : options;
};

/**
 * Marks a synthesized fragment option. The prefix keeps its value distinct from
 * resource option values so a committed fragment keeps fragment semantics even
 * when its text equals an existing resource name.
 */
const FRAGMENT_VALUE_PREFIX = '__maas-fragment__:';

/**
 * Builds the "Filter by" fragment option for the currently typed text. Unlike
 * TypeaheadSelect's built-in creatable behavior, the fragment option is offered
 * even when the typed text exactly matches an existing option, so committing a
 * partial-text fragment stays possible for every query.
 */
const toFragmentOption = (filterValue: string): TypeaheadSelectOption => ({
  value: `${FRAGMENT_VALUE_PREFIX}${filterValue}`,
  content: `Filter by "${filterValue}"`,
  isCreateOption: true,
});

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
  // Track the typed text so the fragment option can be part of selectOptions;
  // TypeaheadSelect only resolves selections against selectOptions.
  const [filterValue, setFilterValue] = React.useState('');

  // A committed fragment (or a navigation-initialized display name) has no
  // option with a matching resource value; synthesize one so it stays visible
  // in the toggle and can be cleared like a regular selection. It is aria
  // disabled so the menu never presents it as a selectable resource.
  const selectOptions = React.useMemo(() => {
    const base =
      value && !options.some((o) => String(o.value) === value)
        ? [...options, { value, content: value, isAriaDisabled: true }]
        : options;
    // Whitespace-only input must not offer a fragment: the overview filtering
    // logic treats an all-whitespace fragment as no filter at all.
    const trimmed = filterValue.trim();
    return trimmed ? [...base, toFragmentOption(trimmed)] : base;
  }, [options, value, filterValue]);

  return (
    <TypeaheadSelect
      selectOptions={selectOptions}
      selected={value}
      onSelect={(_event, selection) => {
        const selected = String(selection);
        // Resolve against the original options first: a resource value that
        // happens to begin with the fragment prefix must stay an exact
        // selection with its own label, not be truncated into a fragment.
        const option = options.find((o) => String(o.value) === selected);
        let next: string;
        if (option) {
          next = selected;
          onChange(selected, String(option.content));
        } else if (selected.startsWith(FRAGMENT_VALUE_PREFIX)) {
          // A fragment option selection commits the typed text as a fragment.
          next = selected.slice(FRAGMENT_VALUE_PREFIX.length);
          onChange(next);
        } else {
          next = selected;
          onChange(selected);
        }
        // TypeaheadSelect replays the current selection when clearing edited
        // input; only a selection that changes the applied filter counts as a
        // filter application.
        if (next !== value) {
          onFilterApplied?.();
        }
      }}
      onClearSelection={() => onChange('')}
      onInputChange={setFilterValue}
      onToggle={(nextIsOpen) => {
        // Drop the typed text once the menu closes so the fragment option
        // does not linger in the option list
        if (!nextIsOpen) {
          setFilterValue('');
        }
      }}
      filterFunction={filterByLabelOrValue}
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
