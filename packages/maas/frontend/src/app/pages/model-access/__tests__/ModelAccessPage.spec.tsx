import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { restGET } from 'mod-arch-core';
import '@testing-library/jest-dom';
import ModelAccessPage from '~/app/pages/model-access/ModelAccessPage';
import type { MaaSSubscription } from '~/app/types/subscriptions';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  restGET: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ApplicationsPage: ({
    children,
    title,
    description,
  }: React.PropsWithChildren<{ title: string; description: React.ReactNode }>) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

// Host-only presentation and analytics depend on the dashboard's module aliases.
jest.mock('@odh-dashboard/internal/components/table/TableRowTitleDescription', () => ({
  __esModule: true,
  default: ({ title, description }: { title: React.ReactNode; description?: string }) => (
    <div>
      {title}
      <p>{description}</p>
    </div>
  ),
}));
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
  fireFormTrackingEvent: jest.fn(),
}));

const mockRestGET = jest.mocked(restGET);

// Mirrors the admin-subscriptions response produced from the mock maas-api fixture.
const subscription = (): MaaSSubscription => ({
  name: 'premium-team-sub',
  namespace: 'maas-system',
  displayName: 'Premium Team',
  description: 'Premium Team Subscription',
  owner: {
    groups: [
      { name: '42c3e46f-2477-44d7-a85b-d3b43f6b31fa/ai-grid-users' },
      { name: '42c3e46f-2477-44d7-a85b-d3b43f6b31fa/data-science' },
    ],
  },
  modelRefs: [
    {
      name: 'granite-3-8b-instruct',
      namespace: 'maas-models',
      displayName: 'Granite 3 8B Instruct',
      tokenRateLimits: [{ limit: 100000, window: '24h' }],
    },
    {
      name: 'flan-t5-small',
      namespace: 'maas-models',
      displayName: 'Flan T5 Small',
      tokenRateLimits: [{ limit: 200000, window: '24h' }],
    },
  ],
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ModelAccessPage />
    </MemoryRouter>,
  );

describe('ModelAccessPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRestGET.mockResolvedValue({ data: [subscription()] });
  });

  it('should render admin-subscriptions data in the real read-only table', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'Premium Team' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Model Access' })).toBeInTheDocument();
    expect(screen.getByText('Premium Team Subscription')).toBeInTheDocument();
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);
    expect(screen.queryByText('Basic Team')).not.toBeInTheDocument();
    expect(screen.getByTestId('subscription-groups-expand-btn')).toHaveTextContent('2');
    expect(screen.getByTestId('subscription-models-expand-btn')).toHaveTextContent('2');
    expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('subscription-actions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create subscription/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(mockRestGET).toHaveBeenCalledTimes(1);
    expect(mockRestGET.mock.calls[0][1]).toBe('/maas/api/v1/admin-subscriptions');
  });

  it('should expand the groups and models supplied by admin-subscriptions', async () => {
    const user = userEvent.setup();
    renderPage();
    const groups = await screen.findByTestId('subscription-groups-expand-btn');
    await user.click(within(groups).getByRole('button'));
    expect(screen.getByText('42c3e46f-2477-44d7-a85b-d3b43f6b31fa/ai-grid-users')).toBeVisible();
    expect(screen.getByText('42c3e46f-2477-44d7-a85b-d3b43f6b31fa/data-science')).toBeVisible();
    await user.click(
      within(screen.getByTestId('subscription-models-expand-btn')).getByRole('button'),
    );
    expect(screen.getByText('Granite 3 8B Instruct')).toBeVisible();
    expect(screen.getByText('Flan T5 Small')).toBeVisible();
  });

  it('should reflect zero groups and models without hiding the subscription', async () => {
    mockRestGET.mockResolvedValue({
      data: [{ ...subscription(), owner: { groups: [] }, modelRefs: [] }],
    });
    renderPage();
    expect(await screen.findByRole('link', { name: 'Premium Team' })).toBeInTheDocument();
    expect(screen.getByTestId('subscription-groups-expand-btn')).toHaveTextContent('0');
    expect(screen.getByTestId('subscription-models-expand-btn')).toHaveTextContent('0');
  });

  it('should show the empty state when no admin subscriptions are returned', async () => {
    mockRestGET.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText('No subscriptions')).toBeInTheDocument();
    expect(screen.queryByTestId('subscription-row')).not.toBeInTheDocument();
  });

  it('should show the API error instead of subscription data', async () => {
    mockRestGET.mockRejectedValue(new Error('Subscriptions unavailable'));
    renderPage();
    expect(await screen.findByTestId('error-empty-state-body')).toHaveTextContent(
      'Error communicating with server',
    );
    expect(screen.queryByTestId('subscription-row')).not.toBeInTheDocument();
  });
});
