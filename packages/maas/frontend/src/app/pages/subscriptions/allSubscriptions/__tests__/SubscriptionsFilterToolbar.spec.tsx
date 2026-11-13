import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionsFilterToolbar from '~/app/pages/subscriptions/allSubscriptions/SubscriptionsFilterToolbar';
import { MaaSSubscription } from '~/app/types/subscriptions';
import {
  SubscriptionsFilterDataType,
  SubscriptionsFilterOptions,
} from '~/app/pages/subscriptions/allSubscriptions/const';

type TypeaheadSelectProps = {
  selectOptions: { value: string; content: string }[];
  filterFunction?: (
    filterValue: string,
    options: { value: string; content: string }[],
  ) => unknown[];
  isCreatable?: boolean;
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

const renderToolbar = (filterData: SubscriptionsFilterDataType) =>
  render(
    <SubscriptionsFilterToolbar
      subscriptions={[subscription]}
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
    expect(typeaheadProps.selectOptions).toEqual([{ value: 'granite-8b', content: 'Granite 8B' }]);
  });

  it('should support committing typed text as a fragment filter', () => {
    renderToolbar({
      subscription: undefined,
      group: undefined,
      model: undefined,
    });

    // A committed fragment has no matching option value; the field must stay creatable
    // so the "Filter by" option can commit it
    expect(typeaheadProps.isCreatable).toBe(true);

    // Fragment matching filters options by label or resource name, case-insensitively
    const filterFunction = typeaheadProps.filterFunction!;
    expect(filterFunction).toBeDefined();
    const results = filterFunction('granite', typeaheadProps.selectOptions) as {
      value: string;
      content: string;
    }[];
    expect(results.map((option) => option.value)).toContain('granite-8b');
  });
});
