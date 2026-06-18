import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionManagementPage from '~/app/pages/subscription-management/SubscriptionManagementPage';

const mockNavigate = jest.fn();
let mockTab: string | undefined;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ tab: mockTab }),
}));

jest.mock('@odh-dashboard/internal/pages/ApplicationsPage', () => {
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
  return { __esModule: true, default: MockApplicationsPage };
});

jest.mock('~/app/pages/subscription-management/OverviewTab', () => {
  const MockOverviewTab = () => <div data-testid="mock-overview-tab">OverviewTab</div>;
  MockOverviewTab.displayName = 'MockOverviewTab';
  return { __esModule: true, default: MockOverviewTab };
});

jest.mock('~/app/pages/subscription-management/SubscriptionsTab', () => {
  const MockSubscriptionsTab = () => (
    <div data-testid="mock-subscriptions-tab">SubscriptionsTab</div>
  );
  MockSubscriptionsTab.displayName = 'MockSubscriptionsTab';
  return { __esModule: true, default: MockSubscriptionsTab };
});

jest.mock('~/app/pages/subscription-management/AuthPoliciesTab', () => {
  const MockAuthPoliciesTab = () => <div data-testid="mock-auth-policies-tab">AuthPoliciesTab</div>;
  MockAuthPoliciesTab.displayName = 'MockAuthPoliciesTab';
  return { __esModule: true, default: MockAuthPoliciesTab };
});

describe('SubscriptionManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTab = undefined;
  });

  it('should show title and description', () => {
    render(<SubscriptionManagementPage />);

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Subscription management');
    expect(screen.getByTestId('app-page-description')).toHaveTextContent(
      'Manage subscriptions and authorization policies',
    );
  });

  it('should render all three tabs', () => {
    render(<SubscriptionManagementPage />);

    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    expect(screen.getByTestId('subscriptions-tab')).toBeInTheDocument();
    expect(screen.getByTestId('auth-policies-tab')).toBeInTheDocument();
  });

  it('should default to the overview tab when no tab param is provided', () => {
    render(<SubscriptionManagementPage />);

    expect(screen.getByTestId('overview-tab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('mock-overview-tab')).toBeInTheDocument();
  });

  it('should activate the subscriptions tab when tab param is "subscriptions"', () => {
    mockTab = 'subscriptions';
    render(<SubscriptionManagementPage />);

    expect(screen.getByTestId('subscriptions-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should activate the auth policies tab when tab param is "auth-policies"', () => {
    mockTab = 'auth-policies';
    render(<SubscriptionManagementPage />);

    expect(screen.getByTestId('auth-policies-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should fall back to overview tab for an invalid tab param', () => {
    mockTab = 'invalid-tab';
    render(<SubscriptionManagementPage />);

    expect(screen.getByTestId('overview-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should navigate when a tab is clicked', () => {
    render(<SubscriptionManagementPage />);

    fireEvent.click(screen.getByTestId('subscriptions-tab'));
    expect(mockNavigate).toHaveBeenCalledWith('/maas/subscription-management/subscriptions');

    fireEvent.click(screen.getByTestId('auth-policies-tab'));
    expect(mockNavigate).toHaveBeenCalledWith('/maas/subscription-management/auth-policies');
  });
});
