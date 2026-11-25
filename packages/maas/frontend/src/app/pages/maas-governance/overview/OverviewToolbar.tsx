import * as React from 'react';
import { Button, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { URL_PREFIX } from '~/app/utilities/const';
import { GroupOverviewItem, ModelOverviewItem } from '~/app/types/subscriptions';
import TypeaheadFilterField, { toSelectOptions } from '~/app/components/TypeaheadFilterField';
import type { TypeaheadFilterOption } from '~/app/components/TypeaheadFilterField';
import {
  EventTrackingFilterAttribute,
  MaaSEvents,
  MaaSGovernanceOverviewFilteredProperties,
} from '~/app/types/event-tracking';
import { OverviewFilterDataType, OverviewFilterOptions, overviewFilterOptions } from './const';

type OverviewToolbarProps = {
  filterData: OverviewFilterDataType;
  onFilterUpdate: (
    key: OverviewFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
  /** Source of the typeahead filter options; values match on resource names. */
  rows: ModelOverviewItem[];
  /** Groups view resources; merged into the filter options so they stay selectable even when no models are registered. */
  groupRows: GroupOverviewItem[];
  returnTo?: string;
};

const OverviewToolbar: React.FC<OverviewToolbarProps> = ({
  filterData,
  onFilterUpdate,
  rows,
  groupRows,
  returnTo,
}) => {
  const { modelOptions, projectOptions, groupOptions, subscriptionOptions, authPolicyOptions } =
    React.useMemo(() => {
      // Keyed by `${name}/${namespace}`: the same model name can be registered in
      // multiple projects, and each project's option keeps its own display label
      const modelLabels = new Map<string, string>();
      // A reference without a display name never overwrites a label already known
      // for that model (e.g. a registered model's friendly label)
      const setModelLabel = (key: string, name: string, displayName?: string) => {
        if (displayName || !modelLabels.has(key)) {
          modelLabels.set(key, displayName ?? modelLabels.get(key) ?? name);
        }
      };
      const projectLabels = new Map<string, string>();
      const groupLabels = new Map<string, string>();
      const subscriptionLabels = new Map<string, string>();
      const authPolicyLabels = new Map<string, string>();
      rows.forEach((row) => {
        modelLabels.set(`${row.id}/${row.namespace}`, row.modelDetails.displayName ?? row.id);
        projectLabels.set(row.namespace, row.namespace);
        row.subscriptions.forEach((sub) => {
          subscriptionLabels.set(sub.name, sub.displayName ?? sub.name);
          sub.groups?.forEach((group) => groupLabels.set(group, group));
        });
        row.authPolicies.forEach((policy) => {
          authPolicyLabels.set(policy.name, policy.displayName ?? policy.name);
          policy.groups?.forEach((group) => groupLabels.set(group, group));
        });
      });
      groupRows.forEach((row) => {
        groupLabels.set(row.name, row.name);
        row.subscriptions.forEach((sub) => {
          subscriptionLabels.set(sub.name, sub.displayName ?? sub.name);
          sub.groups?.forEach((group) => groupLabels.set(group, group));
          // Groups can reference models that have no registered overview row
          sub.modelRefs.forEach((ref) => {
            setModelLabel(`${ref.name}/${ref.namespace}`, ref.name, ref.displayName);
            projectLabels.set(ref.namespace, ref.namespace);
          });
        });
        row.authPolicies.forEach((policy) => {
          authPolicyLabels.set(policy.name, policy.displayName ?? policy.name);
          policy.groups?.forEach((group) => groupLabels.set(group, group));
          policy.modelRefs.forEach((ref) => {
            setModelLabel(`${ref.name}/${ref.namespace}`, ref.name, ref.displayName);
            projectLabels.set(ref.namespace, ref.namespace);
          });
        });
      });
      // The option value is the model name so an exact selection matches every
      // project that registered it; same-name registrations collapse into one
      // option whose label is the first label seen, with every other
      // registration label kept as a search alias so each stays discoverable
      const toModelOptions = (): TypeaheadFilterOption[] => {
        const optionsByName = new Map<string, TypeaheadFilterOption>();
        modelLabels.forEach((label, key) => {
          const name = key.slice(0, key.lastIndexOf('/'));
          const existing = optionsByName.get(name);
          if (!existing) {
            optionsByName.set(name, { value: name, content: label });
          } else if (label !== existing.content) {
            existing.searchAliases = [...(existing.searchAliases ?? []), label];
          }
        });
        return Array.from(optionsByName.values())
          .toSorted((a, b) => String(a.content).localeCompare(String(b.content)))
          .map(({ value, content, searchAliases }) => ({ value, content, searchAliases }));
      };
      return {
        modelOptions: toModelOptions(),
        projectOptions: toSelectOptions(projectLabels),
        groupOptions: toSelectOptions(groupLabels),
        subscriptionOptions: toSelectOptions(subscriptionLabels),
        authPolicyOptions: toSelectOptions(authPolicyLabels),
      };
    }, [rows, groupRows]);

  const fireFiltered = (filterAttribute: EventTrackingFilterAttribute) =>
    fireMiscTrackingEvent(MaaSEvents.MAAS_GOVERNANCE_OVERVIEW_FILTERED, {
      filterAttribute,
    } satisfies MaaSGovernanceOverviewFilteredProperties);

  return (
    <FilterToolbar<OverviewFilterOptions>
      testId="overview-table-toolbar"
      filterOptions={overviewFilterOptions}
      filterOptionRenders={{
        [OverviewFilterOptions.modelName]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={modelOptions}
            placeholder="Select a model"
            testId="overview-model-name-filter-toggle"
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.MODEL)}
          />
        ),
        [OverviewFilterOptions.project]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={projectOptions}
            placeholder="Select a project"
            testId="overview-project-name-filter-toggle"
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.PROJECT)}
          />
        ),
        [OverviewFilterOptions.groupName]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={groupOptions}
            placeholder="Select a group"
            testId="overview-group-name-filter-toggle"
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.GROUP)}
          />
        ),
        [OverviewFilterOptions.subscriptionName]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={subscriptionOptions}
            placeholder="Select a subscription"
            testId="overview-subscription-name-filter-toggle"
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.SUBSCRIPTION)}
          />
        ),
        [OverviewFilterOptions.authPolicyName]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={authPolicyOptions}
            placeholder="Select an authorization policy"
            testId="overview-policy-name-filter-toggle"
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.POLICY)}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    >
      <ToolbarGroup>
        <ToolbarItem>
          <Button
            variant="secondary"
            component={(props) => (
              <Link
                {...props}
                to={`${URL_PREFIX}/maas-governance/subscriptions/create`}
                state={{
                  returnTo: returnTo ?? `${URL_PREFIX}/maas-governance/overview`,
                  breadcrumbLabel: 'MaaS governance',
                }}
              />
            )}
            data-testid="toolbar-create-subscription-button"
          >
            Create subscription
          </Button>
        </ToolbarItem>
        <ToolbarItem>
          <Button
            variant="secondary"
            component={(props) => (
              <Link
                {...props}
                to={`${URL_PREFIX}/maas-governance/auth-policies/create`}
                state={{
                  returnTo: returnTo ?? `${URL_PREFIX}/maas-governance/overview`,
                  breadcrumbLabel: 'MaaS governance',
                }}
              />
            )}
            data-testid="toolbar-create-authorization-policy-button"
          >
            Create authorization policy
          </Button>
        </ToolbarItem>
      </ToolbarGroup>
    </FilterToolbar>
  );
};

export default OverviewToolbar;
