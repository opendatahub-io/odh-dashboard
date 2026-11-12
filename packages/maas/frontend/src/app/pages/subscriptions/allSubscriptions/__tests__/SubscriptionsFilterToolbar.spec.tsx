import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionsFilterToolbar from '~/app/pages/subscriptions/allSubscriptions/SubscriptionsFilterToolbar';
import { MaaSSubscription } from '~/app/types/subscriptions';
import {
  MODEL_TEXT_FILTER_PREFIX,
  SubscriptionsFilterDataType,
} from '~/app/pages/subscriptions/allSubscriptions/const';

type TypeaheadSelectProps = {
  selectOptions: { value: string; content: string }[];
  filterFunction?: (
    filterValue: string,
    options: { value: string; content: string }[],
  ) => unknown[];
};

let typeaheadProps: TypeaheadSelectProps;

jest.mock('@odh-dashboard/ui-core/components/TypeaheadSelect', () => ({
  __esModule: true,
  default: (props: TypeaheadSelectProps) => {
    typeaheadProps = props;
    return <div data-testid="mock-typeahead-select" />;
  },
}));

jest.mock('@odh-dashboard/ui-core/components/FilterToolbar', () => ({
  __esModule: true,
  default: ({
    filterOptionRenders,
  }: {
    filterOptionRenders: Record<
      string,
      (props: { onChange: () => void; value?: string }) => React.ReactNode
    >;
  }) => <>{filterOptionRenders.model({ onChange: jest.fn() })}</>,
}));

const graniteSubscription = {
  name: 'granite-sub',
  namespace: 'maas',
  owner: { groups: [{ name: 'team-a' }] },
  modelRefs: [{ name: 'granite-8b' }],
} as unknown as MaaSSubscription;

const renderToolbar = (filterData: SubscriptionsFilterDataType) =>
  render(
    <SubscriptionsFilterToolbar
      subscriptions={[graniteSubscription]}
      filterData={filterData}
      onFilterUpdate={jest.fn()}
    />,
  );

describe('SubscriptionsFilterToolbar model typeahead filtering', () => {
  it('matches model options and the text filter using trimmed input', () => {
    renderToolbar({ subscription: '', group: '', model: '' });

    const filterFunction = typeaheadProps.filterFunction!;
    expect(filterFunction).toBeDefined();

    const results = filterFunction(' Granite ', typeaheadProps.selectOptions) as {
      value: string;
      content: string;
    }[];

    // The Granite option should still be matched despite surrounding spaces...
    expect(results.map((option) => option.value)).toContain('granite-8b');
    // ...and the generated text filter should use the trimmed text.
    expect(results).toContainEqual({
      value: `${MODEL_TEXT_FILTER_PREFIX}Granite`,
      content: 'Filter by "Granite"',
    });
  });
});
