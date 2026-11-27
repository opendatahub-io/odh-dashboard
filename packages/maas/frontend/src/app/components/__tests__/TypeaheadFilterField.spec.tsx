import * as React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TypeaheadFilterField from '~/app/components/TypeaheadFilterField';

type TypeaheadSelectProps = {
  selectOptions: {
    value: string;
    content: string;
    isCreateOption?: boolean;
    isAriaDisabled?: boolean;
    searchAliases?: string[];
  }[];
  selected?: string;
  onSelect?: (event: unknown, selection: string | number) => void;
  onInputChange?: (newValue: string) => void;
  filterFunction?: (filterValue: string, options: unknown[]) => unknown[];
};

let typeaheadProps: TypeaheadSelectProps;

jest.mock('@odh-dashboard/ui-core/components/TypeaheadSelect', () => ({
  __esModule: true,
  default: (props: TypeaheadSelectProps) => {
    typeaheadProps = props;
    return <div data-testid="mock-typeahead-select" />;
  },
}));

describe('TypeaheadFilterField', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should commit a typed fragment without a label when the fragment option is selected', () => {
    render(
      <TypeaheadFilterField
        options={[{ value: 'granite-8b', content: 'Granite 8B' }]}
        placeholder="Filter"
        testId="filter-field"
        onChange={onChange}
      />,
    );

    act(() => {
      typeaheadProps.onInputChange!('gran');
    });
    const fragmentOption = typeaheadProps.selectOptions.find((o) => o.isCreateOption);
    expect(fragmentOption).toBeDefined();
    typeaheadProps.onSelect!(null, String(fragmentOption!.value));

    expect(onChange).toHaveBeenCalledWith('gran');
  });

  it('should keep a resource value beginning with the fragment prefix an exact selection', () => {
    render(
      <TypeaheadFilterField
        options={[{ value: '__maas-fragment__:granite-8b', content: 'Granite 8B (sandbox)' }]}
        placeholder="Filter"
        testId="filter-field"
        onChange={onChange}
      />,
    );

    typeaheadProps.onSelect!(null, '__maas-fragment__:granite-8b');

    expect(onChange).toHaveBeenCalledWith('__maas-fragment__:granite-8b', 'Granite 8B (sandbox)');
  });

  it('should commit an exact resource selection with its label', () => {
    render(
      <TypeaheadFilterField
        options={[{ value: 'granite-8b', content: 'Granite 8B' }]}
        placeholder="Filter"
        testId="filter-field"
        onChange={onChange}
      />,
    );

    typeaheadProps.onSelect!(null, 'granite-8b');

    expect(onChange).toHaveBeenCalledWith('granite-8b', 'Granite 8B');
  });

  it('should show a committed fragment as a non-selectable display option', () => {
    render(
      <TypeaheadFilterField
        options={[{ value: 'granite-8b', content: 'Granite 8B' }]}
        placeholder="Filter"
        testId="filter-field"
        onChange={onChange}
        value="7B"
      />,
    );

    const displayOption = typeaheadProps.selectOptions.find((o) => o.value === '7B');
    expect(displayOption).toBeDefined();
    expect(displayOption!.isAriaDisabled).toBe(true);
  });

  it('should not fire onFilterApplied when the current selection is replayed', () => {
    const onFilterApplied = jest.fn();
    render(
      <TypeaheadFilterField
        options={[{ value: 'granite-8b', content: 'Granite 8B' }]}
        placeholder="Filter"
        testId="filter-field"
        onChange={onChange}
        value="granite-8b"
        onFilterApplied={onFilterApplied}
      />,
    );

    // TypeaheadSelect replays the current selection when clearing edited input
    typeaheadProps.onSelect!(null, 'granite-8b');

    expect(onFilterApplied).not.toHaveBeenCalled();

    typeaheadProps.onSelect!(null, 'granite-8b');
    act(() => {
      typeaheadProps.onInputChange!('7');
    });
    const fragmentOption = typeaheadProps.selectOptions.find((o) => o.isCreateOption);
    typeaheadProps.onSelect!(null, String(fragmentOption!.value));

    expect(onFilterApplied).toHaveBeenCalledTimes(1);
  });

  it('should fire onFilterApplied when switching between an exact selection and a fragment with the same text', () => {
    const onFilterApplied = jest.fn();
    render(
      <TypeaheadFilterField
        options={[{ value: 'granite-8b', content: 'Granite 8B' }]}
        placeholder="Filter"
        testId="filter-field"
        onChange={onChange}
        onFilterApplied={onFilterApplied}
      />,
    );

    // Select the exact option
    typeaheadProps.onSelect!(null, 'granite-8b');
    expect(onFilterApplied).toHaveBeenCalledTimes(1);

    // Commit a fragment with the same text: the applied filter semantics change
    act(() => {
      typeaheadProps.onInputChange!('granite-8b');
    });
    const fragmentOption = typeaheadProps.selectOptions.find((o) => o.isCreateOption);
    typeaheadProps.onSelect!(null, String(fragmentOption!.value));

    expect(onFilterApplied).toHaveBeenCalledTimes(2);
  });

  it('should fire onFilterApplied when the same filter is reapplied after external removal', () => {
    const onFilterApplied = jest.fn();
    const view = render(
      <TypeaheadFilterField
        options={[{ value: 'granite-8b', content: 'Granite 8B' }]}
        placeholder="Filter"
        testId="filter-field"
        onChange={onChange}
        value="granite-8b"
        onFilterApplied={onFilterApplied}
      />,
    );

    // External chip removal or clear-all changes the controlled value without
    // calling onClearSelection
    view.rerender(
      <TypeaheadFilterField
        options={[{ value: 'granite-8b', content: 'Granite 8B' }]}
        placeholder="Filter"
        testId="filter-field"
        onChange={onChange}
        onFilterApplied={onFilterApplied}
      />,
    );

    typeaheadProps.onSelect!(null, 'granite-8b');

    expect(onFilterApplied).toHaveBeenCalledTimes(1);
  });

  it('should match typed text against search aliases', () => {
    render(
      <TypeaheadFilterField
        options={[{ value: 'granite-8b', content: 'Granite A', searchAliases: ['Granite B'] }]}
        placeholder="Filter"
        testId="filter-field"
        onChange={onChange}
      />,
    );

    const filtered = typeaheadProps.filterFunction!('granite b', typeaheadProps.selectOptions) as {
      value: string;
    }[];

    expect(filtered.map((o) => o.value)).toEqual(['granite-8b']);
  });
});
