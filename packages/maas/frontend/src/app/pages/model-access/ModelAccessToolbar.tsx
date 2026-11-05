import * as React from 'react';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { MaaSSubscription } from '~/app/types/subscriptions';
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
};

/** Matches the typed filter text against the option label or its resource name. */
const filterByLabelOrValue = (filterValue: string, options: TypeaheadSelectOption[]) =>
  options.filter(
    (option) =>
      String(option.content).toLowerCase().includes(filterValue.toLowerCase()) ||
      String(option.value).toLowerCase().includes(filterValue.toLowerCase()),
  );

/** Deduplicates labels by resource name and sorts them for display. */
const toSelectOptions = (labels: Map<string, string>): TypeaheadSelectOption[] =>
  Array.from(labels.entries())
    .toSorted(([, a], [, b]) => a.localeCompare(b))
    .map(([value, content]) => ({ value, content }));

type TypeaheadFilterFieldProps = {
  options: TypeaheadSelectOption[];
  filterAttribute: EventTrackingFilterAttribute;
  placeholder: string;
  testId: string;
  onChange: (value?: string, label?: string) => void;
  value?: string;
};

const TypeaheadFilterField: React.FC<TypeaheadFilterFieldProps> = ({
  options,
  filterAttribute,
  placeholder,
  testId,
  onChange,
  value,
}) => (
  <TypeaheadSelect
    selectOptions={options}
    selected={value}
    onSelect={(_event, selection) => {
      const selectedOption = options.find((option) => option.value === selection);
      onChange(String(selection), selectedOption ? String(selectedOption.content) : undefined);
      fireMiscTrackingEvent(MaaSEvents.MAAS_SETTINGS_LIST_FILTERED, {
        resourceType: EventTrackingResourceType.SUBSCRIPTION,
        filterAttribute,
      } satisfies MaaSSettingsListFilteredProperties);
    }}
    onClearSelection={() => onChange('')}
    filterFunction={filterByLabelOrValue}
    allowClear
    isRequired={false}
    isScrollable
    placeholder={placeholder}
    toggleWidth="350px"
    dataTestId={testId}
  />
);

/**
 * Toolbar for the read-only Model Access page: filters the subscriptions table
 * through Subscription / Group / Model typeahead selects where the user picks a
 * value from a list or types to narrow the list and selects an item.
 */
const ModelAccessToolbar: React.FC<ModelAccessToolbarProps> = ({
  filterData,
  onFilterUpdate,
  subscriptions,
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

  return (
    <FilterToolbar<keyof typeof modelAccessFilterOptions>
      testId="model-access-table-toolbar"
      filterOptions={modelAccessFilterOptions}
      filterOptionRenders={{
        [SubscriptionsFilterOptions.subscription]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={subscriptionOptions}
            filterAttribute={EventTrackingFilterAttribute.SUBSCRIPTION}
            placeholder="Select a subscription"
            testId="model-access-subscription-filter-toggle"
            onChange={onChange}
            value={value}
          />
        ),
        [SubscriptionsFilterOptions.group]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={groupOptions}
            filterAttribute={EventTrackingFilterAttribute.GROUP}
            placeholder="Select a group"
            testId="model-access-group-filter-toggle"
            onChange={onChange}
            value={value}
          />
        ),
        [SubscriptionsFilterOptions.model]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={modelOptions}
            filterAttribute={EventTrackingFilterAttribute.MODEL}
            placeholder="Select a model"
            testId="model-access-model-filter-toggle"
            onChange={onChange}
            value={value}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    />
  );
};

export default ModelAccessToolbar;
