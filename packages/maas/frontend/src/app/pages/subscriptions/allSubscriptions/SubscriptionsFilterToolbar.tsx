import * as React from 'react';
import { SearchInput } from '@patternfly/react-core';
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
  subscriptionsFilterOptions,
  MODEL_TEXT_FILTER_PREFIX,
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

/** Matches the typed filter text against the option label or its resource name. */
const filterByLabelOrValue = (filterValue: string, options: TypeaheadSelectOption[]) =>
  options.filter(
    (option) =>
      String(option.content).toLowerCase().includes(filterValue.toLowerCase()) ||
      String(option.value).toLowerCase().includes(filterValue.toLowerCase()),
  );

const modelTextFilterOption = (text: string): TypeaheadSelectOption => ({
  value: `${MODEL_TEXT_FILTER_PREFIX}${text}`,
  content: `Filter by "${text}"`,
});

const filterModels = (text: string, options: TypeaheadSelectOption[]) => {
  const trimmedText = text.trim();
  const models = options.filter(
    (option) => !String(option.value).startsWith(MODEL_TEXT_FILTER_PREFIX),
  );
  const matches = filterByLabelOrValue(trimmedText, models);
  return trimmedText ? [...matches, modelTextFilterOption(trimmedText)] : matches;
};

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
  allowTextFilter?: boolean;
};

const TypeaheadFilterField: React.FC<TypeaheadFilterFieldProps> = ({
  options,
  filterAttribute,
  placeholder,
  testId,
  onChange,
  value,
  allowTextFilter = false,
}) => {
  const [inputText, setInputText] = React.useState('');
  const textOption =
    allowTextFilter && value?.startsWith(MODEL_TEXT_FILTER_PREFIX)
      ? modelTextFilterOption(value.slice(MODEL_TEXT_FILTER_PREFIX.length))
      : undefined;
  const inputOption =
    allowTextFilter && inputText.trim() ? modelTextFilterOption(inputText.trim()) : undefined;
  const selectOptions = [...options];
  if (textOption) {
    selectOptions.push(textOption);
  }
  if (inputOption && inputOption.value !== textOption?.value) {
    selectOptions.push(inputOption);
  }

  return (
    <TypeaheadSelect
      selectOptions={selectOptions}
      selected={value}
      onInputChange={setInputText}
      onToggle={(open) => {
        if (!open) {
          setInputText('');
        }
      }}
      onSelect={(_event, selection) => {
        const selectedOption = selectOptions.find((option) => option.value === selection);
        onChange(String(selection), selectedOption ? String(selectedOption.content) : undefined);
        setInputText('');
        fireMiscTrackingEvent(MaaSEvents.MAAS_SETTINGS_LIST_FILTERED, {
          resourceType: EventTrackingResourceType.SUBSCRIPTION,
          filterAttribute,
        } satisfies MaaSSettingsListFilteredProperties);
      }}
      onClearSelection={() => {
        onChange('');
        setInputText('');
      }}
      filterFunction={allowTextFilter ? filterModels : filterByLabelOrValue}
      allowClear
      isRequired={false}
      isScrollable
      placeholder={placeholder}
      toggleWidth="350px"
      dataTestId={testId}
    />
  );
};

type TextFilterFieldProps = Omit<TypeaheadFilterFieldProps, 'options'>;

const TextFilterField: React.FC<TextFilterFieldProps> = ({
  filterAttribute,
  placeholder,
  testId,
  onChange,
  value,
}) => (
  <SearchInput
    value={value ?? ''}
    aria-label={placeholder}
    placeholder={placeholder}
    onChange={(_event, text) => onChange(text)}
    style={{ minWidth: '380px' }}
    onClear={() => onChange('')}
    inputProps={{
      'data-testid': testId,
      onBlur: () => {
        fireMiscTrackingEvent(MaaSEvents.MAAS_SETTINGS_LIST_FILTERED, {
          resourceType: EventTrackingResourceType.SUBSCRIPTION,
          filterAttribute,
        } satisfies MaaSSettingsListFilteredProperties);
      },
    }}
  />
);

/** Free-text subscription search with group and model typeahead selections. */
const SubscriptionsFilterToolbar: React.FC<SubscriptionsFilterToolbarProps> = ({
  filterData,
  onFilterUpdate,
  subscriptions,
  testIdPrefix = 'subscriptions',
  children,
}) => {
  const { groupOptions, modelOptions } = React.useMemo(() => {
    const groupLabels = new Map<string, string>();
    const modelLabels = new Map<string, string>();
    subscriptions.forEach((subscription) => {
      subscription.owner.groups.forEach((group) => groupLabels.set(group.name, group.name));
      subscription.modelRefs.forEach((modelRef) =>
        modelLabels.set(modelRef.name, modelRef.displayName ?? modelRef.name),
      );
    });
    return {
      groupOptions: toSelectOptions(groupLabels),
      modelOptions: toSelectOptions(modelLabels),
    };
  }, [subscriptions]);

  return (
    <FilterToolbar<keyof typeof subscriptionsFilterOptions>
      testId={`${testIdPrefix}-table-toolbar`}
      filterOptions={subscriptionsFilterOptions}
      filterOptionRenders={{
        [SubscriptionsFilterOptions.subscription]: ({ onChange, value }) => (
          <TextFilterField
            filterAttribute={EventTrackingFilterAttribute.SUBSCRIPTION}
            placeholder="Filter by subscription, description, group, or model"
            testId={`${testIdPrefix}-subscription-filter-input`}
            onChange={onChange}
            value={value}
          />
        ),
        [SubscriptionsFilterOptions.group]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={groupOptions}
            filterAttribute={EventTrackingFilterAttribute.GROUP}
            placeholder="Select a group"
            testId={`${testIdPrefix}-group-filter-toggle`}
            onChange={onChange}
            value={value}
          />
        ),
        [SubscriptionsFilterOptions.model]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={modelOptions}
            allowTextFilter
            filterAttribute={EventTrackingFilterAttribute.MODEL}
            placeholder="Select a model"
            testId={`${testIdPrefix}-model-filter-toggle`}
            onChange={onChange}
            value={value}
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
