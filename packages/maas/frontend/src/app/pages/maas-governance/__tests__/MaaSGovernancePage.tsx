import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MaaSGovernancePage from '~/app/pages/maas-governance/MaaSGovernancePage';

const mockNavigate = jest.fn();
let mockTab: string | undefined;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ tab: mockTab }),
}));

jest.mock('~/app/context/MaaSGovernanceContext', () => ({
  useMaaSGovernanceContext: () => ({
    subscriptions: [{ name: 'sub-1' }],
    policies: [{ name: 'policy-1' }],
    modelRefs: [{ name: 'model-1' }],
    groups: [],
    overviewRows: [],
    isEmpty: false,
    loaded: true,
    subscriptionsLoaded: true,
    policiesLoaded: true,
    modelRefsLoaded: true,
    groupsLoaded: true,
    overviewLoaded: true,
    error: undefined,
    overviewError: undefined,
    refresh: jest.fn(),
  }),
}));

jest.mock('@odh-dashboard/ui-core', () => {
  const MockApplicationsPage = (
    props: React.PropsWithChildren<{ title: string; description: React.ReactNode }>,
  ) => (
    <div>
      <h1 data-testid="app-page-title">{props.title}</h1>
      <p data-testid="app-page-description">{props.description}</p>
      {props.children}
    </div>
  );
  MockApplicationsPage.displayName = 'MockApplicationsPage';
  return {
    ...jest.requireActual('@odh-dashboard/ui-core'),
    ApplicationsPage: MockApplicationsPage,
  };
});

jest.mock('~/app/pages/maas-governance/OverviewTab', () => {
  const MockOverviewTab = () => <div data-testid="mock-overview-tab">OverviewTab</div>;
  MockOverviewTab.displayName = 'MockOverviewTab';
  return { __esModule: true, default: MockOverviewTab };
});

jest.mock('~/app/pages/maas-governance/SubscriptionsTab', () => {
  const MockSubscriptionsTab = () => (
    <div data-testid="mock-subscriptions-tab">SubscriptionsTab</div>
  );
  MockSubscriptionsTab.displayName = 'MockSubscriptionsTab';
  return { __esModule: true, default: MockSubscriptionsTab };
});

jest.mock('~/app/pages/maas-governance/AuthPoliciesTab', () => {
  const MockAuthPoliciesTab = () => <div data-testid="mock-auth-policies-tab">AuthPoliciesTab</div>;
  MockAuthPoliciesTab.displayName = 'MockAuthPoliciesTab';
  return { __esModule: true, default: MockAuthPoliciesTab };
});

describe('MaaSGovernancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTab = undefined;
  });

  it('should show title and description', () => {
    render(<MaaSGovernancePage />);

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('MaaS governance');
    expect(screen.getByTestId('app-page-description')).toHaveTextContent(
      'Manage subscriptions and authorization policies',
    );
  });

  it('should render subscriptions, authorization policies, and overview tabs', () => {
    render(<MaaSGovernancePage />);

    expect(screen.queryByTestId('overview-tab')).toBeInTheDocument();
    expect(screen.getByTestId('subscriptions-tab')).toBeInTheDocument();
    expect(screen.getByTestId('auth-policies-tab')).toBeInTheDocument();
  });

  it('should default to the overview tab when no tab param is provided', () => {
    render(<MaaSGovernancePage />);

    expect(screen.getByTestId('overview-tab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('mock-overview-tab')).toBeInTheDocument();
  });

  it('should activate the subscriptions tab when tab param is "subscriptions"', () => {
    mockTab = 'subscriptions';
    render(<MaaSGovernancePage />);

    expect(screen.getByTestId('subscriptions-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should activate the auth policies tab when tab param is "auth-policies"', () => {
    mockTab = 'auth-policies';
    render(<MaaSGovernancePage />);

    expect(screen.getByTestId('auth-policies-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should fall back to overview tab for an invalid tab param', () => {
    mockTab = 'invalid-tab';
    render(<MaaSGovernancePage />);

    expect(screen.getByTestId('overview-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should navigate when a tab is clicked', () => {
    render(<MaaSGovernancePage />);

    fireEvent.click(screen.getByTestId('subscriptions-tab'));
    expect(mockNavigate).toHaveBeenCalledWith('/maas/maas-governance/subscriptions');

    fireEvent.click(screen.getByTestId('auth-policies-tab'));
    expect(mockNavigate).toHaveBeenCalledWith('/maas/maas-governance/auth-policies');
  });
});
