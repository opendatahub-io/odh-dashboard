import * as React from 'react';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { MaaSSubscription } from '~/app/types/subscriptions';
import TypeaheadFilterField, {
  toSelectOptions,
  TypeaheadFilterOption,
} from '~/app/components/TypeaheadFilterField';
import { CallerOrganizationContext, groupLabel } from '~/app/shared/GroupName';
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
  // On Model access, the caller's organization's groups are listed by its name; the value stays
  // the group's full name, so the filter matches as before.
  const organization = React.useContext(CallerOrganizationContext);
  const { subscriptionOptions, groupOptions, modelOptions } = React.useMemo(() => {
    const subscriptionLabels = new Map<string, string>();
    const groupLabels = new Map<string, string>();
    // Keyed by model name so the same model referenced by several subscriptions
    // collapses into one option; each ref's description becomes a search alias
    const modelsByName = new Map<string, TypeaheadFilterOption>();
    subscriptions.forEach((subscription) => {
      subscriptionLabels.set(subscription.name, subscription.displayName ?? subscription.name);
      subscription.owner.groups.forEach((group) =>
        groupLabels.set(group.name, groupLabel(group.name, organization)),
      );
      subscription.modelRefs.forEach((modelRef) => {
        const existing = modelsByName.get(modelRef.name);
        if (!existing) {
          modelsByName.set(modelRef.name, {
            value: modelRef.name,
            content: modelRef.displayName ?? modelRef.name,
            ...(modelRef.description ? { searchAliases: [modelRef.description] } : {}),
          });
        } else if (
          modelRef.description &&
          !existing.searchAliases?.includes(modelRef.description)
        ) {
          existing.searchAliases = [...(existing.searchAliases ?? []), modelRef.description];
        }
      });
    });
    return {
      subscriptionOptions: toSelectOptions(subscriptionLabels),
      groupOptions: toSelectOptions(groupLabels),
      modelOptions: Array.from(modelsByName.values()).toSorted((a, b) =>
        String(a.content).localeCompare(String(b.content)),
      ),
    };
  }, [subscriptions, organization]);

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
            placeholder="Filter by subscription name"
            testId={`${testIdPrefix}-subscription-filter-toggle`}
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.SUBSCRIPTION)}
          />
        ),
        [SubscriptionsFilterOptions.group]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={groupOptions}
            placeholder="Filter by group name"
            testId={`${testIdPrefix}-group-filter-toggle`}
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.GROUP)}
          />
        ),
        [SubscriptionsFilterOptions.model]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={modelOptions}
            placeholder="Filter by model name, ID, or description"
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
