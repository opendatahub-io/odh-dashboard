import * as React from 'react';
import { Button, SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { Link } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
import { OverviewFilterDataType, OverviewFilterOptions, overviewFilterOptions } from './const';

type OverviewToolbarProps = {
  filterData: OverviewFilterDataType;
  onFilterUpdate: (
    key: OverviewFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
  returnTo?: string;
};

const OverviewToolbar: React.FC<OverviewToolbarProps> = ({
  filterData,
  onFilterUpdate,
  returnTo,
}) => (
  <FilterToolbar<OverviewFilterOptions>
    testId="overview-table-toolbar"
    filterOptions={overviewFilterOptions}
    filterOptionRenders={{
      [OverviewFilterOptions.modelName]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by model name, model ID, or description"
          placeholder="Filter by model name, model ID, or description"
          onChange={(_event, value) => onChange(value)}
          data-testid="overview-model-name-filter-input"
        />
      ),
      [OverviewFilterOptions.groupName]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by group name"
          placeholder="Filter by group name"
          onChange={(_event, value) => onChange(value)}
          data-testid="overview-group-name-filter-input"
        />
      ),
      [OverviewFilterOptions.subscriptionName]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by subscription name"
          placeholder="Filter by subscription name"
          onChange={(_event, value) => onChange(value)}
          data-testid="overview-subscription-name-filter-input"
        />
      ),
      [OverviewFilterOptions.authPolicyName]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by authorization policy name"
          placeholder="Filter by authorization policy name"
          onChange={(_event, value) => onChange(value)}
          data-testid="overview-policy-name-filter-input"
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
              to={`${URL_PREFIX}/subscription-management/subscriptions/create`}
              state={{
                returnTo: returnTo ?? `${URL_PREFIX}/subscription-management/overview`,
                breadcrumbLabel: 'Subscription management',
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
              to={`${URL_PREFIX}/subscription-management/auth-policies/create`}
              state={{
                returnTo: returnTo ?? `${URL_PREFIX}/subscription-management/overview`,
                breadcrumbLabel: 'Subscription management',
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

export default OverviewToolbar;
