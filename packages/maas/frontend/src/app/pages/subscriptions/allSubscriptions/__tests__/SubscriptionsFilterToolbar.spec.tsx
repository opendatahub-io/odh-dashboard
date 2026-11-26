import * as React from 'react';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionsFilterToolbar from '~/app/pages/subscriptions/allSubscriptions/SubscriptionsFilterToolbar';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';
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
  onInputChange?: (value: string) => void;
  onToggle?: (open: boolean) => void;
  onSelect?: (event: unknown, selection: string | number | undefined) => void;
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

const renderToolbar = (filterData: SubscriptionsFilterDataType, trackEvent = jest.fn()) =>
  render(
    <TrackingProvider trackEvent={trackEvent}>
      <SubscriptionsFilterToolbar
        subscriptions={[graniteSubscription]}
        filterData={filterData}
        onFilterUpdate={jest.fn()}
      />
    </TrackingProvider>,
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

  it('removes the stale text filter option when the menu closes', () => {
    renderToolbar({ subscription: '', group: '', model: '' });

    const textOption = `${MODEL_TEXT_FILTER_PREFIX}Granite`;

    // Typing adds the "Filter by" option to the dropdown
    act(() => typeaheadProps.onInputChange!(' Granite '));
    expect(typeaheadProps.selectOptions.map((option) => option.value)).toContain(textOption);

    // Closing the menu without selecting should clear the stale option
    act(() => typeaheadProps.onToggle!(false));
    expect(typeaheadProps.selectOptions.map((option) => option.value)).not.toContain(textOption);
  });

  it('forwards the filter selection to the host-supplied callback', () => {
    const trackEvent = jest.fn();
    renderToolbar({ subscription: '', group: '', model: '' }, trackEvent);

    expect(trackEvent).not.toHaveBeenCalled();
    act(() => typeaheadProps.onSelect!(null, 'granite-8b'));
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('MaaS Settings List Filtered', {
      resourceType: 'subscription',
      filterAttribute: 'model',
    });
  });
});
