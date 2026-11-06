import * as React from 'react';
import { Button, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { getAuthPolicyCreateUrl } from '~/app/utilities/maasGovernanceNavigation';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import TypeaheadFilterField, { toSelectOptions } from '~/app/components/TypeaheadFilterField';
import {
  EventTrackingFilterAttribute,
  EventTrackingResourceType,
  MaaSEvents,
  MaaSSettingsListFilteredProperties,
} from '~/app/types/event-tracking';
import {
  AuthPoliciesFilterDataType,
  AuthPoliciesFilterOptions,
  authPoliciesFilterOptions,
} from './const';

type AuthPoliciesToolbarProps = {
  filterData: AuthPoliciesFilterDataType;
  onFilterUpdate: (
    key: AuthPoliciesFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
  /** Source of the typeahead filter options; values match on resource names. */
  authPolicies: MaaSAuthPolicy[];
  returnTo?: string;
};

/**
 * Toolbar for the MaaS governance authorization policies tab: filters the
 * policies table through Model / Group / Authorization policy typeahead
 * selects where the user picks a value from a list, types to narrow the list
 * and selects an item, or commits a partial text fragment to match all rows
 * containing it.
 */
const AuthPoliciesToolbar: React.FC<AuthPoliciesToolbarProps> = ({
  filterData,
  onFilterUpdate,
  authPolicies,
  returnTo,
}) => {
  const { modelOptions, groupOptions, policyOptions } = React.useMemo(() => {
    const modelLabels = new Map<string, string>();
    const groupLabels = new Map<string, string>();
    const policyLabels = new Map<string, string>();
    authPolicies.forEach((policy) => {
      policyLabels.set(policy.name, policy.displayName ?? policy.name);
      policy.subjects.groups?.forEach((group) => groupLabels.set(group.name, group.name));
      policy.modelRefs.forEach((modelRef) =>
        modelLabels.set(modelRef.name, modelRef.displayName ?? modelRef.name),
      );
    });
    return {
      modelOptions: toSelectOptions(modelLabels),
      groupOptions: toSelectOptions(groupLabels),
      policyOptions: toSelectOptions(policyLabels),
    };
  }, [authPolicies]);

  const fireFiltered = (filterAttribute: EventTrackingFilterAttribute) =>
    fireMiscTrackingEvent(MaaSEvents.MAAS_SETTINGS_LIST_FILTERED, {
      resourceType: EventTrackingResourceType.AUTHPOLICY,
      filterAttribute,
    } satisfies MaaSSettingsListFilteredProperties);

  return (
    <FilterToolbar<AuthPoliciesFilterOptions>
      testId="auth-policies-table-toolbar"
      filterOptions={authPoliciesFilterOptions}
      filterOptionRenders={{
        [AuthPoliciesFilterOptions.model]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={modelOptions}
            placeholder="Select a model"
            testId="auth-policies-model-filter-toggle"
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.MODEL)}
          />
        ),
        [AuthPoliciesFilterOptions.group]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={groupOptions}
            placeholder="Select a group"
            testId="auth-policies-group-filter-toggle"
            onChange={onChange}
            value={value}
            onFilterApplied={() => fireFiltered(EventTrackingFilterAttribute.GROUP)}
          />
        ),
        [AuthPoliciesFilterOptions.policy]: ({ onChange, value }) => (
          <TypeaheadFilterField
            options={policyOptions}
            placeholder="Select an authorization policy"
            testId="auth-policies-policy-filter-toggle"
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
            variant="primary"
            component={(props) => (
              <Link
                {...props}
                to={getAuthPolicyCreateUrl()}
                state={returnTo ? { returnTo } : undefined}
              />
            )}
            data-testid="create-auth-policy-button"
          >
            Create authorization policy
          </Button>
        </ToolbarItem>
      </ToolbarGroup>
    </FilterToolbar>
  );
};

export default AuthPoliciesToolbar;
