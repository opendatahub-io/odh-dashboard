import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModelAccessPage from '~/app/pages/model-access/ModelAccessPage';

jest.mock('~/app/context/MaaSGovernanceContext', () => ({
  MaaSGovernanceProvider: ({ children }: React.PropsWithChildren) => (
    <div data-testid="mock-maas-governance-provider">{children}</div>
  ),
}));

jest.mock('~/app/pages/maas-governance/SubscriptionsTab', () => {
  const MockSubscriptionsTab: React.FC<{ readOnly?: boolean }> = ({ readOnly }) => (
    <div data-testid="mock-subscriptions-tab">{readOnly ? 'read-only' : 'editable'}</div>
  );
  MockSubscriptionsTab.displayName = 'MockSubscriptionsTab';
  return { __esModule: true, default: MockSubscriptionsTab };
});

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

describe('ModelAccessPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the page title and description', () => {
    render(<ModelAccessPage />);

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Model Access');
    expect(screen.getByTestId('app-page-description')).toHaveTextContent(
      'Manage subscriptions that control access to models through the Models-as-a-Server (MaaS) gateway.',
    );
  });

  it('should reuse the MaaS governance subscriptions tab in read-only mode', () => {
    render(<ModelAccessPage />);

    expect(screen.getByTestId('mock-subscriptions-tab')).toHaveTextContent('read-only');
  });

  it('should not render tabs', () => {
    render(<ModelAccessPage />);

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('should provide the MaaS governance data layer', () => {
    render(<ModelAccessPage />);

    expect(screen.getByTestId('mock-maas-governance-provider')).toContainElement(
      screen.getByTestId('mock-subscriptions-tab'),
    );
  });
});
