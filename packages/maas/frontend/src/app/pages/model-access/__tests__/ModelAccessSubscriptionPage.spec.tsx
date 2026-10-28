import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { restGET } from 'mod-arch-core';
import '@testing-library/jest-dom';
import ModelAccessSubscriptionPage from '~/app/pages/model-access/ModelAccessSubscriptionPage';
import type { UserSubscription } from '~/app/types/subscriptions';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  restGET: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ApplicationsPage: ({
    children,
    title,
    breadcrumb,
    loadError,
    errorMessage,
    empty,
    emptyMessage,
  }: React.PropsWithChildren<{
    title: React.ReactNode;
    breadcrumb?: React.ReactNode;
    loadError?: Error;
    errorMessage?: string;
    empty?: boolean;
    emptyMessage?: string;
  }>) => (
    <div>
      <h1>{title}</h1>
      {breadcrumb}
      {loadError && <p>{errorMessage}</p>}
      {empty && !loadError && <p>{emptyMessage}</p>}
      {children}
    </div>
  ),
}));

// Host-only presentation depends on the dashboard's module aliases.
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

// Mirrors the maas-api passthrough response from GET /api/v1/subscriptions/{id}.
const subscription = (): UserSubscription => ({
  subscription_id_header: 'premium-team-sub',
  subscription_description: 'Premium Team Subscription',
  display_name: 'Premium Team',
  inference_priority: 10,
  owner: {
    groups: [
      { name: '42c3e46f-2477-44d7-a85b-d3b43f6b31fa/ai-grid-users' },
      { name: '42c3e46f-2477-44d7-a85b-d3b43f6b31fa/data-science' },
    ],
  },
  model_refs: [
    {
      name: 'granite-3-8b-instruct',
      display_name: 'Granite 3 8B Instruct',
      namespace: 'maas-models',
      token_rate_limits: [{ limit: 100000, window: '24h' }],
    },
    {
      name: 'flan-t5-small',
      display_name: 'Flan T5 Small',
      namespace: 'maas-models',
      token_rate_limits: [{ limit: 200000, window: '24h' }],
    },
  ],
});

const renderPage = (name = 'premium-team-sub') =>
  render(
    <MemoryRouter initialEntries={[`/maas/model-access/view/${name}`]}>
      <Routes>
        <Route
          path="/maas/model-access/view/:subscriptionName"
          element={<ModelAccessSubscriptionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('ModelAccessSubscriptionPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRestGET.mockResolvedValue({ data: subscription() });
  });

  it('should render subscription details from the passthrough endpoint', async () => {
    renderPage();
    expect(await screen.findByText('Premium Team Subscription')).toBeInTheDocument();
    expect(screen.getAllByText('Premium Team').length).toBeGreaterThan(0);
    expect(screen.getByText('premium-team-sub')).toBeInTheDocument();
    expect(mockRestGET).toHaveBeenCalledTimes(1);
    expect(mockRestGET.mock.calls[0][1]).toBe('/maas/api/v1/subscriptions/premium-team-sub');
  });

  it('should omit the subscription status field', async () => {
    renderPage();
    await screen.findByText('Premium Team Subscription');
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('subscription-phase')).not.toBeInTheDocument();
  });

  it('should render the owner groups', async () => {
    renderPage();
    expect(
      await screen.findByText('42c3e46f-2477-44d7-a85b-d3b43f6b31fa/ai-grid-users'),
    ).toBeVisible();
    expect(screen.getByText('42c3e46f-2477-44d7-a85b-d3b43f6b31fa/data-science')).toBeVisible();
  });

  it('should render the models without the model status column', async () => {
    renderPage();
    expect(await screen.findByText('Granite 3 8B Instruct')).toBeVisible();
    expect(screen.getByText('Flan T5 Small')).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument();
  });

  it('should link back to the Model Access page', async () => {
    renderPage();
    const backLink = await screen.findByTestId('breadcrumb-model-access-link');
    expect(backLink).toHaveTextContent('Model Access');
    expect(backLink).toHaveAttribute('href', '/maas/model-access');
  });

  it('should show the error state when the request fails', async () => {
    mockRestGET.mockRejectedValue(new Error('Subscriptions unavailable'));
    renderPage();
    expect(await screen.findByText('Unable to load subscription details.')).toBeInTheDocument();
  });
});
