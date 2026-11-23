import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthPoliciesTab from '~/app/pages/maas-governance/AuthPoliciesTab';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import {
  AuthPoliciesFilterOptions,
  AuthPoliciesFilterSelection,
} from '~/app/pages/auth-policies/allAuthPolicies/const';

type TableProps = {
  authPolicies: MaaSAuthPolicy[];
  toolbarContent: React.ReactNode;
};
type ToolbarProps = {
  onFilterUpdate: (
    key: AuthPoliciesFilterOptions,
    value?: string | AuthPoliciesFilterSelection,
  ) => void;
};

let tableProps: TableProps;
let toolbarProps: ToolbarProps;

jest.mock('~/app/context/MaaSGovernanceContext', () => ({
  useMaaSGovernanceContext: () => mockContextValue,
}));

jest.mock('~/app/pages/auth-policies/allAuthPolicies/AuthPoliciesTable', () => ({
  __esModule: true,
  default: (props: TableProps) => {
    tableProps = props;
    return (
      <div data-testid="mock-auth-policies-table">
        {props.toolbarContent}
        {props.authPolicies.map((policy) => (
          <span key={policy.name} data-testid={`policy-${policy.name}`}>
            {policy.name}
          </span>
        ))}
      </div>
    );
  },
}));

jest.mock('~/app/pages/auth-policies/allAuthPolicies/AuthPoliciesToolbar', () => ({
  __esModule: true,
  default: (props: ToolbarProps) => {
    toolbarProps = props;
    return <div data-testid="mock-auth-policies-toolbar" />;
  },
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

const mockContextValue = {
  policies: [] as MaaSAuthPolicy[],
  policiesLoaded: true,
  policiesError: undefined,
  refresh: jest.fn(),
};

const policyA: MaaSAuthPolicy = {
  name: 'policy-granite-team-a',
  modelRefs: [
    { name: 'granite-8b', namespace: 'maas', displayName: 'Granite 8B' },
    { name: 'granite-8b-preview', namespace: 'maas' },
  ],
  subjects: { groups: [{ name: 'team-a' }] },
} as unknown as MaaSAuthPolicy;

const policyB: MaaSAuthPolicy = {
  name: 'policy-mistral-team-b',
  modelRefs: [{ name: 'mistral-7b', namespace: 'maas', displayName: 'Mistral 7B' }],
  subjects: { groups: [{ name: 'team-b' }, { name: 'team-a' }] },
} as unknown as MaaSAuthPolicy;

const policyC: MaaSAuthPolicy = {
  name: 'policy-no-groups',
  modelRefs: [{ name: 'granite-3b', namespace: 'maas' }],
  subjects: {},
} as unknown as MaaSAuthPolicy;

const policyD: MaaSAuthPolicy = {
  name: 'policy-granite-preview-team-c',
  modelRefs: [{ name: 'granite-8b-preview', namespace: 'maas' }],
  subjects: { groups: [{ name: 'team-c' }] },
} as unknown as MaaSAuthPolicy;

const renderTab = () => {
  mockContextValue.policies = [policyA, policyB, policyC, policyD];
  render(<AuthPoliciesTab />);
  expect(screen.getByTestId('mock-auth-policies-table')).toBeInTheDocument();
};

const setFilter = (key: AuthPoliciesFilterOptions, value?: string | AuthPoliciesFilterSelection) =>
  act(() => toolbarProps.onFilterUpdate(key, value));

const visiblePolicyNames = () => tableProps.authPolicies.map((policy) => policy.name).toSorted();

describe('AuthPoliciesTab filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue.policies = [];
    mockContextValue.policiesLoaded = true;
    mockContextValue.policiesError = undefined;
  });

  it('should show all policies when no filter is set', () => {
    renderTab();

    expect(visiblePolicyNames()).toEqual([
      'policy-granite-preview-team-c',
      'policy-granite-team-a',
      'policy-mistral-team-b',
      'policy-no-groups',
    ]);
  });

  it('should filter by an exact model selection, not by name prefix', () => {
    renderTab();

    setFilter(AuthPoliciesFilterOptions.model, { label: 'granite-8b', value: 'granite-8b' });

    // granite-8b-preview (policyD) shares the prefix but must not match an exact selection
    expect(visiblePolicyNames()).toEqual(['policy-granite-team-a']);
  });

  it('should filter by a model fragment against names and display names, case-insensitively', () => {
    renderTab();

    // Partial text committed as a fragment matches by inclusion
    setFilter(AuthPoliciesFilterOptions.model, 'GRANITE');

    expect(visiblePolicyNames()).toEqual([
      'policy-granite-preview-team-c',
      'policy-granite-team-a',
      'policy-no-groups',
    ]);

    setFilter(AuthPoliciesFilterOptions.model, 'Mistral 7');
    expect(visiblePolicyNames()).toEqual(['policy-mistral-team-b']);
  });

  it('should filter by an exact group selection and exclude policies without groups', () => {
    renderTab();

    setFilter(AuthPoliciesFilterOptions.group, { label: 'team-b', value: 'team-b' });

    expect(visiblePolicyNames()).toEqual(['policy-mistral-team-b']);
  });

  it('should filter by a group fragment', () => {
    renderTab();

    setFilter(AuthPoliciesFilterOptions.group, 'team-a');

    expect(visiblePolicyNames()).toEqual(['policy-granite-team-a', 'policy-mistral-team-b']);
  });

  it('should combine model and group filters to the intersecting subset', () => {
    renderTab();

    setFilter(AuthPoliciesFilterOptions.model, { label: 'granite-8b', value: 'granite-8b' });
    setFilter(AuthPoliciesFilterOptions.group, 'team-a');

    expect(visiblePolicyNames()).toEqual(['policy-granite-team-a']);

    // Narrowing the group fragment to team-b empties the result
    setFilter(AuthPoliciesFilterOptions.group, 'team-b');
    expect(visiblePolicyNames()).toEqual([]);

    // A combined model fragment and exact group selection
    setFilter(AuthPoliciesFilterOptions.model, 'mistral');
    setFilter(AuthPoliciesFilterOptions.group, { label: 'team-b', value: 'team-b' });
    expect(visiblePolicyNames()).toEqual(['policy-mistral-team-b']);
  });
});
