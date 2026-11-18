import * as React from 'react';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionsFilterToolbar from '~/app/pages/subscriptions/allSubscriptions/SubscriptionsFilterToolbar';
import { MaaSSubscription } from '~/app/types/subscriptions';
import {
  SubscriptionsFilterDataType,
  SubscriptionsFilterOptions,
} from '~/app/pages/subscriptions/allSubscriptions/const';

type TypeaheadSelectProps = {
  selectOptions: { value: string; content: string; isCreateOption?: boolean }[];
  filterFunction?: (
    filterValue: string,
    options: { value: string; content: string }[],
  ) => unknown[];
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

const renderedCategories: string[] = [];

jest.mock('@odh-dashboard/ui-core/components/FilterToolbar', () => ({
  __esModule: true,
  default: ({
    filterOptionRenders,
  }: {
    filterOptionRenders: Record<
      string,
      (props: { onChange: () => void; value?: string }) => React.ReactNode
    >;
  }) => {
    renderedCategories.length = 0;
    return (
      <>
        {Object.entries(filterOptionRenders).map(([category, renderField]) => {
          renderedCategories.push(category);
          return renderField({ onChange: jest.fn() });
        })}
      </>
    );
  },
}));

const subscription = {
  name: 'granite-sub',
  namespace: 'maas',
  owner: { groups: [{ name: 'team-a' }] },
  modelRefs: [{ name: 'granite-8b', displayName: 'Granite 8B' }],
} as unknown as MaaSSubscription;

// Includes a repeated model and one supplied out of label order so the
// derived options exercise deduplication and sorting
const subscriptions = [
  subscription,
  {
    name: 'zeta-sub',
    namespace: 'maas',
    owner: { groups: [{ name: 'team-b' }] },
    modelRefs: [
      { name: 'granite-8b', displayName: 'Granite 8B' },
      { name: 'granite-3b', displayName: 'Granite 3B' },
    ],
  } as unknown as MaaSSubscription,
];

const renderToolbar = (filterData: SubscriptionsFilterDataType) =>
  render(
    <SubscriptionsFilterToolbar
      subscriptions={subscriptions}
      filterData={filterData}
      onFilterUpdate={jest.fn()}
    />,
  );

describe('SubscriptionsFilterToolbar', () => {
  it('should render typeahead filter fields for subscription, group, and model', () => {
    renderToolbar({
      subscription: undefined,
      group: undefined,
      model: undefined,
    });

    expect(renderedCategories).toEqual(
      expect.arrayContaining([
        SubscriptionsFilterOptions.subscription,
        SubscriptionsFilterOptions.group,
        SubscriptionsFilterOptions.model,
      ]),
    );
  });

  it('should derive deduplicated and sorted options from the loaded subscriptions', () => {
    renderToolbar({
      subscription: undefined,
      group: undefined,
      model: undefined,
    });

    // The model field renders last; its options derive from modelRefs
    expect(typeaheadProps.selectOptions).toEqual([
      { value: 'granite-3b', content: 'Granite 3B' },
      { value: 'granite-8b', content: 'Granite 8B' },
    ]);
  });

  it('should support committing typed text as a fragment filter', () => {
    renderToolbar({
      subscription: undefined,
      group: undefined,
      model: undefined,
    });

    // Fragment matching filters options by label or resource name, case-insensitively
    const filterFunction = typeaheadProps.filterFunction!;
    expect(filterFunction).toBeDefined();
    const results = filterFunction('granite', typeaheadProps.selectOptions) as {
      value: string;
      content: string;
    }[];
    expect(results.map((option) => option.value)).toContain('granite-8b');

    // Typing offers a "Filter by" fragment option even when the text exactly
    // matches an existing option, so exact-match queries stay committable as
    // partial-text fragments
    act(() => {
      typeaheadProps.onInputChange!('granite-8b');
    });
    const withFragment = filterFunction('granite-8b', typeaheadProps.selectOptions) as {
      value: string;
      content: string;
      isCreateOption?: boolean;
    }[];
    expect(withFragment).toHaveLength(2);
    expect(withFragment[1]).toEqual(
      expect.objectContaining({ content: 'Filter by "granite-8b"', isCreateOption: true }),
    );
  });
});
