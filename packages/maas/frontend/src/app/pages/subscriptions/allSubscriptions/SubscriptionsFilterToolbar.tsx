import * as React from 'react';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { MaaSSubscription } from '~/app/types/subscriptions';
import TypeaheadFilterField, { toSelectOptions } from '~/app/components/TypeaheadFilterField';
import {
  EventTrackingFilterAttribute,
  EventTrackingResourceType,
  MaaSEvents,
  MaaSSettingsListFilteredProperties,
} from '~/app/types/event-tracking';
import {
  subscriptionsFilterOptions,
  SubscriptionsFilterDataType,
  SubscriptionsFilterOptions,
} from '~/app/pages/subscriptions/allSubscriptions/const';

type SubscriptionsFilterToolbarProps = {
  testIdPrefix?: string;
  children?: React.ReactNode;
  filterData: SubscriptionsFilterDataType;
  onFilterUpdate: (
    key: SubscriptionsFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
  /** Source of the typeahead filter options; values match on resource names. */
  subscriptions: MaaSSubscription[];
};

/** Shared subscriptions toolbar: Subscription / Group / Model typeahead selects
 * with fragment matching, used by the subscriptions page, the MaaS governance
 * subscriptions tab, and the model access viewer. */
const SubscriptionsFilterToolbar: React.FC<SubscriptionsFilterToolbarProps> = ({
  filterData,
  onFilterUpdate,
  subscriptions,
  testIdPrefix = 'subscriptions',
  children,
}) => {
  const { subscriptionOptions, groupOptions, modelOptions } = React.useMemo(() => {
    const subscriptionLabels = new Map<string, string>();
    const groupLabels = new Map<string, string>();
    const modelLabels = new Map<string, string>();
    subscriptions.forEach((subscription) => {
      subscriptionLabels.set(subscription.name, subscription.displayName ?? subscription.name);
      subscription.owner.groups.forEach((group) => groupLabels.set(group.name, group.name));
      subscription.modelRefs.forEach((modelRef) =>
        modelLabels.set(modelRef.name, modelRef.displayName ?? modelRef.name),
      );
    });
    return {
      subscriptionOptions: toSelectOptions(subscriptionLabels),
      groupOptions: toSelectOptions(groupLabels),
      modelOptions: toSelectOptions(modelLabels),
    };
  }, [subscriptions]);

  const fireFiltered = (filterAttribute: EventTrackingFilterAttribute) =>
    fireMiscTrackingEvent(MaaSEvents.MAAS_SETTINGS_LIST_FILTERED, {
      resourceType: EventTrackingResourceType.SUBSCRIPTION,
      filterAttribute,
    } satisfies MaaSSettingsListFilteredProperties);

  return (
    <FilterToolbar<keyof typeof subscriptionsFilterOptions>
      testId={`${testIdPrefix}-table-toolbar`}
      filterOptions={subscriptionsFilterOptions}
      filterOptionRenders={{
        [SubscriptionsFilterOptions.subscription]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={subscriptionOptions}
            placeholder="Select a subscription"
            testId={`${testIdPrefix}-subscription-filter-toggle`}
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.SUBSCRIPTION)}
          />
        ),
        [SubscriptionsFilterOptions.group]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={groupOptions}
            placeholder="Select a group"
            testId={`${testIdPrefix}-group-filter-toggle`}
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.GROUP)}
          />
        ),
        [SubscriptionsFilterOptions.model]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={modelOptions}
            placeholder="Select a model"
            testId={`${testIdPrefix}-model-filter-toggle`}
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.MODEL)}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    >
      {children}
    </FilterToolbar>
  );
};

export default SubscriptionsFilterToolbar;
