import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApiKeysAndSubscriptionsPage from '~/app/pages/api-keys/ApiKeysAndSubscriptionsPage';

const mockNavigate = jest.fn();
let mockTab: string | undefined;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ tab: mockTab }),
}));

jest.mock('~/app/pages/api-keys/ApiKeysTab', () => {
  const MockApiKeysTab = () => <div data-testid="mock-api-keys-tab">ApiKeysTab</div>;
  MockApiKeysTab.displayName = 'MockApiKeysTab';
  return { __esModule: true, default: MockApiKeysTab };
});

jest.mock('~/app/pages/api-keys/SubscriptionsTab', () => {
  const MockSubscriptionsTab = () => (
    <div data-testid="mock-subscriptions-tab">SubscriptionsTab</div>
  );
  MockSubscriptionsTab.displayName = 'MockSubscriptionsTab';
  return { __esModule: true, default: MockSubscriptionsTab };
});

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

describe('ApiKeysAndSubscriptionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTab = undefined;
  });

  it('should show updated title and description', () => {
    render(<ApiKeysAndSubscriptionsPage />);

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('API keys and subscriptions');
    expect(screen.getByTestId('app-page-description')).toHaveTextContent(
      'Manage your API keys and view your subscription access',
    );
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
});
