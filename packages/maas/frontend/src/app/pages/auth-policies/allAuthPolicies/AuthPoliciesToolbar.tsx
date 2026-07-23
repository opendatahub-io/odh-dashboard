import * as React from 'react';
import { Button, SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { Link } from 'react-router-dom';
import { getAuthPolicyCreateUrl } from '~/app/utilities/subscriptionManagementNavigation';
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
  returnTo?: string;
};

const AuthPoliciesToolbar: React.FC<AuthPoliciesToolbarProps> = ({
  filterData,
  onFilterUpdate,
  returnTo,
}) => (
  <FilterToolbar<AuthPoliciesFilterOptions>
    data-testid="auth-policies-table-toolbar"
    filterOptions={authPoliciesFilterOptions}
    filterOptionRenders={{
      [AuthPoliciesFilterOptions.keyword]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by name, resource name, or description"
          placeholder="Filter by name, resource name, or description"
          onChange={(_event, value) => onChange(value)}
          data-testid="auth-policies-filter-name-input"
          style={{ minWidth: '350px' }}
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

export default AuthPoliciesToolbar;
