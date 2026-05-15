import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import type { DashboardConfigKind } from '@odh-dashboard/internal/k8sTypes';
import AllApiKeysPage from '~/app/pages/api-keys/AllApiKeysPage';

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

const renderWithConfig = (mySubscriptions: boolean, tab?: string) => {
  mockTab = tab;
  const configSpec = {
    dashboardConfig: { mySubscriptions },
  } as DashboardConfigKind['spec'];

  return render(
    <DashboardConfigContext.Provider value={configSpec}>
      <AllApiKeysPage />
    </DashboardConfigContext.Provider>,
  );
};

describe('AllApiKeysPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTab = undefined;
  });

  describe('when mySubscriptions flag is disabled', () => {
    it('should show default title and description', () => {
      renderWithConfig(false);

      expect(screen.getByTestId('app-page-title')).toHaveTextContent('API keys');
      expect(screen.getByTestId('app-page-description')).toHaveTextContent(
        'Manage API keys that can be used to authenticate with model endpoints.',
      );
    });

    it('should render ApiKeysTab directly without tabs', () => {
      renderWithConfig(false);

      expect(screen.getByTestId('mock-api-keys-tab')).toBeInTheDocument();
      expect(screen.queryByTestId('api-keys-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('subscriptions-tab')).not.toBeInTheDocument();
    });
  });

  describe('when mySubscriptions flag is enabled', () => {
    it('should show updated title and description', () => {
      renderWithConfig(true);

      expect(screen.getByTestId('app-page-title')).toHaveTextContent('API keys and subscriptions');
      expect(screen.getByTestId('app-page-description')).toHaveTextContent(
        'Manage your API keys and view your subscription access',
      );
    });

    it('should render tabs for API keys and Subscriptions', () => {
      renderWithConfig(true);

      expect(screen.getByTestId('api-keys-tab')).toBeInTheDocument();
      expect(screen.getByTestId('subscriptions-tab')).toBeInTheDocument();
    });

    it('should default to the API keys tab when no tab param is provided', () => {
      renderWithConfig(true);

      expect(screen.getByTestId('api-keys-tab')).toHaveAttribute('aria-selected', 'true');
    });

    it('should activate the subscriptions tab when tab param is "subscriptions"', () => {
      renderWithConfig(true, 'subscriptions');

      expect(screen.getByTestId('subscriptions-tab')).toHaveAttribute('aria-selected', 'true');
    });

    it('should fall back to API keys tab for an invalid tab param', () => {
      renderWithConfig(true, 'invalid-tab');

      expect(screen.getByTestId('api-keys-tab')).toHaveAttribute('aria-selected', 'true');
    });
  });
});
