import * as React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TypeaheadFilterField from '~/app/components/TypeaheadFilterField';

type TypeaheadSelectProps = {
  selectOptions: { value: string; content: string; isCreateOption?: boolean }[];
  selected?: string;
  onSelect?: (event: unknown, selection: string | number) => void;
  onInputChange?: (newValue: string) => void;
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
});
