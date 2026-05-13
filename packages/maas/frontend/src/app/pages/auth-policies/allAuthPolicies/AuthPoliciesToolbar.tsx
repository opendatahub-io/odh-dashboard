import * as React from 'react';
import { Button, SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import { useNavigate } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
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
};

const AuthPoliciesToolbar: React.FC<AuthPoliciesToolbarProps> = ({
  filterData,
  onFilterUpdate,
}) => {
  const navigate = useNavigate();
  return (
    <FilterToolbar<AuthPoliciesFilterOptions>
      data-testid="auth-policies-table-toolbar"
      filterOptions={authPoliciesFilterOptions}
      filterOptionRenders={{
        [AuthPoliciesFilterOptions.keyword]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by keyword"
            placeholder="Filter by name or description"
            onChange={(_event, value) => onChange(value)}
            data-testid="auth-policies-filter-name-input"
            style={{ width: '30ch' }}
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
            onClick={() => navigate(`${URL_PREFIX}/auth-policies/create`)}
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
