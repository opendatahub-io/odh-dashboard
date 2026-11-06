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
  modelAccessFilterOptions,
  SubscriptionsFilterDataType,
  SubscriptionsFilterOptions,
} from '~/app/pages/subscriptions/allSubscriptions/const';

type ModelAccessToolbarProps = {
  filterData: SubscriptionsFilterDataType;
  onFilterUpdate: (
    key: SubscriptionsFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
  /** Source of the typeahead filter options; values match on resource names. */
  subscriptions: MaaSSubscription[];
  /** Toolbar content rendered after the filters, e.g. a create button. */
  children?: React.ReactNode;
};

/**
 * Toolbar for the read-only Model Access page and the MaaS governance
 * subscriptions tab: filters the subscriptions table through Model / Group /
 * Subscription typeahead selects where the user picks a value from a list,
 * types to narrow the list and selects an item, or commits a partial text
 * fragment to match all rows containing it.
 */
const ModelAccessToolbar: React.FC<ModelAccessToolbarProps> = ({
  filterData,
  onFilterUpdate,
  subscriptions,
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
    <FilterToolbar<keyof typeof modelAccessFilterOptions>
      testId="model-access-table-toolbar"
      filterOptions={modelAccessFilterOptions}
      filterOptionRenders={{
        [SubscriptionsFilterOptions.model]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={modelOptions}
            placeholder="Select a model"
            testId="model-access-model-filter-toggle"
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.MODEL)}
          />
        ),
        [SubscriptionsFilterOptions.group]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={groupOptions}
            placeholder="Select a group"
            testId="model-access-group-filter-toggle"
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.GROUP)}
          />
        ),
        [SubscriptionsFilterOptions.subscription]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={subscriptionOptions}
            placeholder="Select a subscription"
            testId="model-access-subscription-filter-toggle"
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.SUBSCRIPTION)}
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

export default ModelAccessToolbar;
