import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApiKeysAndSubscriptionsPage from '~/app/pages/keys-and-subs/ApiKeysAndSubscriptionsPage';

const mockNavigate = jest.fn();
let mockTab: string | undefined;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ tab: mockTab }),
}));

jest.mock('~/app/pages/keys-and-subs/apiKeys/ApiKeysTab', () => {
  const MockApiKeysTab = () => <div data-testid="mock-api-keys-tab">ApiKeysTab</div>;
  MockApiKeysTab.displayName = 'MockApiKeysTab';
  return { __esModule: true, default: MockApiKeysTab };
});

jest.mock('~/app/pages/keys-and-subs/mySubscriptions/SubscriptionsTab', () => {
  const MockSubscriptionsTab = () => (
    <div data-testid="mock-subscriptions-tab">SubscriptionsTab</div>
  );
  MockSubscriptionsTab.displayName = 'MockSubscriptionsTab';
  return { __esModule: true, default: MockSubscriptionsTab };
});

jest.mock('@odh-dashboard/internal/concepts/design/TitleWithIcon', () => {
  const MockTitleWithIcon = ({ title }: { title: string }) => (
    <span data-testid="app-page-title">{title}</span>
  );
  MockTitleWithIcon.displayName = 'MockTitleWithIcon';
  return { __esModule: true, default: MockTitleWithIcon };
});

jest.mock('@odh-dashboard/internal/pages/ApplicationsPage', () => {
  const MockApplicationsPage = (props: React.PropsWithChildren<{ title: React.ReactNode }>) => (
    <div>
      <div data-testid="app-page-title-wrapper">{props.title}</div>
      {props.children}
    </div>
  );
  MockApplicationsPage.displayName = 'MockApplicationsPage';
  return { __esModule: true, default: MockApplicationsPage };
});

describe('ApiKeysAndSubscriptionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTab = undefined;
  });

  it('should show the API keys page title', () => {
    render(<ApiKeysAndSubscriptionsPage />);

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('API keys');
  });

  it('should render tabs for API keys and Subscriptions', () => {
    render(<ApiKeysAndSubscriptionsPage />);

    expect(screen.getByTestId('api-keys-tab')).toBeInTheDocument();
    expect(screen.getByTestId('subscriptions-tab')).toBeInTheDocument();
  });

  it('should default to the API keys tab when no tab param is provided', () => {
    render(<ApiKeysAndSubscriptionsPage />);

    expect(screen.getByTestId('api-keys-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should activate the subscriptions tab when tab param is "subscriptions"', () => {
    mockTab = 'subscriptions';
    render(<ApiKeysAndSubscriptionsPage />);

    expect(screen.getByTestId('subscriptions-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should fall back to API keys tab for an invalid tab param', () => {
    mockTab = 'invalid-tab';
    render(<ApiKeysAndSubscriptionsPage />);

    expect(screen.getByTestId('api-keys-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should navigate when switching to the subscriptions tab', () => {
    render(<ApiKeysAndSubscriptionsPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Subscriptions tab' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/keys-and-subs/subscriptions'),
    );
  });

  it('should navigate when switching to the API keys tab', () => {
    mockTab = 'subscriptions';
    render(<ApiKeysAndSubscriptionsPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'API keys tab' }));

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/keys-and-subs/tokens'));
  });

  it('should not navigate when clicking the already active tab', () => {
    render(<ApiKeysAndSubscriptionsPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'API keys tab' }));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should not navigate when clicking the already active subscriptions tab', () => {
    mockTab = 'subscriptions';
    render(<ApiKeysAndSubscriptionsPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Subscriptions tab' }));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
