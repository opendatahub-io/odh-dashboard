import * as React from 'react';
import { Button, SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import { PlusIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
import {
  AuthPoliciesFilterDataType,
  AuthPoliciesFilterOptions,
  authPoliciesFilterOptions,
} from './const';

const PHASE_OPTIONS: SimpleSelectOption[] = [
  { key: 'Pending', label: 'Pending' },
  { key: 'Active', label: 'Active' },
  { key: 'Failed', label: 'Failed' },
];

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
        [AuthPoliciesFilterOptions.phase]: ({ value, onChange, ...props }) => (
          <SimpleSelect
            {...props}
            value={value}
            aria-label="Filter by phase"
            placeholder="Filter by phase"
            options={PHASE_OPTIONS}
            onChange={(v) => onChange(v)}
            dataTestId="auth-policies-filter-phase-select"
            popperProps={{ maxWidth: undefined }}
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
            icon={<PlusIcon />}
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
