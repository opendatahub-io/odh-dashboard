import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { restGET } from 'mod-arch-core';
import '@testing-library/jest-dom';
import ModelAccessPage from '~/app/pages/model-access/ModelAccessPage';
import SubscriptionsTab from '~/app/pages/maas-governance/SubscriptionsTab';
import { MaaSGovernanceProvider } from '~/app/context/MaaSGovernanceContext';
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

// Shares the data-science group and the flan-t5-small model with the premium team
// subscription so each filter has a different matching subset.
const basicSubscription = (): MaaSSubscription => ({
  ...subscription(),
  name: 'basic-team-sub',
  displayName: 'Basic Team',
  description: 'Basic Team Subscription',
  owner: { groups: [{ name: '42c3e46f-2477-44d7-a85b-d3b43f6b31fa/data-science' }] },
  modelRefs: [subscription().modelRefs[1]],
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ModelAccessPage />
    </MemoryRouter>,
  );

const renderTwoSubscriptions = () => {
  mockRestGET.mockResolvedValue({ data: [subscription(), basicSubscription()] });
  return renderPage();
};

const selectFilterType = async (
  user: ReturnType<typeof userEvent.setup>,
  optionTestId: string,
  toolbarTestId = 'model-access-table-toolbar',
) => {
  await user.click(screen.getByTestId(`${toolbarTestId}-dropdown`));
  // The data-testid lands on the list item; the click handler is on its menu item button.
  await user.click(within(screen.getByTestId(optionTestId)).getByRole('menuitem'));
};

const openTypeahead = async (
  user: ReturnType<typeof userEvent.setup>,
  toolbarTestId = 'model-access-table-toolbar',
) => {
  const combobox = within(screen.getByTestId(toolbarTestId)).getByRole('combobox');
  await user.click(combobox);
  return combobox;
};

/** Selects the subscription filter category and commits a partial text fragment. */
const filterBySubscriptionText = async (
  user: ReturnType<typeof userEvent.setup>,
  text: string,
  toolbarTestId = 'model-access-table-toolbar',
) => {
  await selectFilterType(user, `${toolbarTestId}-option-subscription`, toolbarTestId);
  const input = await openTypeahead(user, toolbarTestId);
  await user.type(input, text);
  await user.click(screen.getByRole('option', { name: `Filter by "${text}"` }));
};

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

  it('should offer Subscription, Group, and Model filters instead of the keyword search', async () => {
    const user = userEvent.setup();
    renderTwoSubscriptions();
    await screen.findByRole('link', { name: 'Premium Team' });

    expect(screen.queryByTestId('subscriptions-filter-input')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('model-access-table-toolbar-dropdown'));
    expect(screen.getByTestId('model-access-table-toolbar-option-subscription')).toHaveTextContent(
      'Subscription',
    );
    expect(screen.getByTestId('model-access-table-toolbar-option-group')).toHaveTextContent(
      'Group',
    );
    expect(screen.getByTestId('model-access-table-toolbar-option-model')).toHaveTextContent(
      'Model',
    );
  });

  it('should use the same three filters by default on the management subscriptions table', async () => {
    const user = userEvent.setup();
    mockRestGET.mockResolvedValue({ data: [subscription(), basicSubscription()] });
    render(
      <MemoryRouter>
        <MaaSGovernanceProvider subscriptionsOnly>
          <SubscriptionsTab />
        </MaaSGovernanceProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('link', { name: 'Premium Team' });
    expect(screen.getByTestId('create-subscription-button')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();

    await filterBySubscriptionText(user, 'ANITE 3', 'subscriptions-table-toolbar');
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    await user.click(screen.getByTestId('subscriptions-table-toolbar-dropdown'));
    for (const filter of ['subscription', 'group', 'model']) {
      expect(
        screen.getByTestId(`subscriptions-table-toolbar-option-${filter}`),
      ).toBeInTheDocument();
    }
    await user.click(
      within(screen.getByTestId('subscriptions-table-toolbar-option-model')).getByRole('menuitem'),
    );
    const modelInput = within(screen.getByTestId('subscriptions-table-toolbar')).getByRole(
      'combobox',
    );
    await user.type(modelInput, 'ANITE');
    await user.click(screen.getByRole('option', { name: 'Filter by "ANITE"' }));
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Premium Team' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));
    await user.click(screen.getByTestId('subscriptions-table-toolbar-dropdown'));
    await user.click(
      within(screen.getByTestId('subscriptions-table-toolbar-option-group')).getByRole('menuitem'),
    );
    await user.click(
      within(screen.getByTestId('subscriptions-table-toolbar')).getByRole('combobox'),
    );
    await user.click(
      screen.getByRole('option', { name: '42c3e46f-2477-44d7-a85b-d3b43f6b31fa/ai-grid-users' }),
    );
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Premium Team' })).toBeInTheDocument();
  });

  it('should filter the table by subscription text', async () => {
    const user = userEvent.setup();
    renderTwoSubscriptions();
    await screen.findByRole('link', { name: 'Premium Team' });
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(2);

    // A partial fragment that does not exactly match an option label commits as a text filter
    await filterBySubscriptionText(user, 'Basic');

    expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Basic Team' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Premium Team' })).not.toBeInTheDocument();
    // The active filter renders as a chip labeled with the fragment
    expect(screen.getByTestId('subscription-filter-chip')).toHaveTextContent('Basic');
  });

  it('should filter the table by the selected group', async () => {
    const user = userEvent.setup();
    renderTwoSubscriptions();
    await screen.findByRole('link', { name: 'Premium Team' });

    await selectFilterType(user, 'model-access-table-toolbar-option-group');
    await openTypeahead(user);
    await user.click(
      screen.getByRole('option', { name: '42c3e46f-2477-44d7-a85b-d3b43f6b31fa/ai-grid-users' }),
    );

    expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Premium Team' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Basic Team' })).not.toBeInTheDocument();
  });

  it.each(['ANITE 3', 'ANITE-3'])(
    'should narrow model options by partial text and filter the table after selection: %s',
    async (text) => {
      const user = userEvent.setup();
      renderTwoSubscriptions();
      await screen.findByRole('link', { name: 'Premium Team' });

      await selectFilterType(user, 'model-access-table-toolbar-option-model');
      const input = await openTypeahead(user);
      await user.type(input, text);

      expect(screen.getAllByRole('option')).toHaveLength(2);
      expect(screen.getByRole('option', { name: `Filter by "${text}"` })).toBeInTheDocument();
      expect(screen.getAllByTestId('subscription-row')).toHaveLength(2);
      await user.click(screen.getByRole('option', { name: 'Granite 3 8B Instruct' }));

      expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);
      expect(screen.getByRole('link', { name: 'Premium Team' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Basic Team' })).not.toBeInTheDocument();
      expect(screen.getByTestId('model-filter-chip')).toHaveTextContent('Granite 3 8B Instruct');
    },
  );

  it.each(['MIUM-T', 'mium Te', 'exclusive description', 'AI-GRID', 'ANITE-3', 'ANITE 3'])(
    'should search subscription details by partial text: %s',
    async (text) => {
      const user = userEvent.setup();
      mockRestGET.mockResolvedValue({
        data: [
          { ...subscription(), description: 'An exclusive description for this subscription' },
          basicSubscription(),
        ],
      });
      renderPage();
      await screen.findByRole('link', { name: 'Premium Team' });

      await filterBySubscriptionText(user, text);

      expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);
      expect(screen.getByRole('link', { name: 'Premium Team' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Basic Team' })).not.toBeInTheDocument();
    },
  );

  it('should match substrings in the model dropdown and restore rows when selection is cleared', async () => {
    const user = userEvent.setup();
    mockRestGET.mockResolvedValue({
      data: ['xabx', 'yaby', 'abc', 'other'].map((name) => ({
        ...subscription(),
        name,
        displayName: name,
        modelRefs: [{ name, namespace: 'maas-models' }],
      })),
    });
    renderPage();
    await screen.findByRole('link', { name: 'xabx' });
    await selectFilterType(user, 'model-access-table-toolbar-option-model');
    const input = await openTypeahead(user);
    await user.type(input, 'AB');

    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getAllByRole('option')[3]).toHaveTextContent('Filter by "AB"');
    for (const name of ['xabx', 'yaby', 'abc']) {
      expect(screen.getByRole('option', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('option', { name: 'other' })).not.toBeInTheDocument();
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(4);

    await user.click(screen.getByRole('option', { name: 'Filter by "AB"' }));
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(3);
    expect(screen.queryByRole('link', { name: 'other' })).not.toBeInTheDocument();
    expect(screen.getByTestId('model-filter-chip')).toHaveTextContent('AB');
    expect(input).toHaveValue('AB');

    await user.clear(input);
    await user.type(input, 'xabx');
    // An exact match with an existing option hides the create option; selecting the
    // option filters by its resource name instead.
    expect(screen.queryByRole('option', { name: 'Filter by "xabx"' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'xabx' }));
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'xabx' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(4);
  });

  it.each(['ANITE 3', 'ANITE-3'])(
    'should apply model text searches to display and resource names: %s',
    async (text) => {
      const user = userEvent.setup();
      renderTwoSubscriptions();
      await screen.findByRole('link', { name: 'Premium Team' });
      await selectFilterType(user, 'model-access-table-toolbar-option-model');
      await user.type(await openTypeahead(user), text);
      await user.click(screen.getByRole('option', { name: `Filter by "${text}"` }));

      expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);
      expect(screen.getByRole('link', { name: 'Premium Team' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Basic Team' })).not.toBeInTheDocument();

      await selectFilterType(user, 'model-access-table-toolbar-option-subscription');
      await user.type(await openTypeahead(user), 'Basic');
      await user.click(screen.getByRole('option', { name: 'Filter by "Basic"' }));
      expect(screen.queryByTestId('subscription-row')).not.toBeInTheDocument();
    },
  );

  it('should allow a model text search with no matches and clear it', async () => {
    const user = userEvent.setup();
    renderTwoSubscriptions();
    await screen.findByRole('link', { name: 'Premium Team' });
    await selectFilterType(user, 'model-access-table-toolbar-option-model');
    await user.type(await openTypeahead(user), 'missing-model');
    await user.click(screen.getByRole('option', { name: 'Filter by "missing-model"' }));

    expect(screen.queryByTestId('subscription-row')).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear all filters' })[0]);
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(2);
  });

  it('should combine filters and restore the table when filters are cleared', async () => {
    const user = userEvent.setup();
    renderTwoSubscriptions();
    await screen.findByRole('link', { name: 'Premium Team' });

    // Subscription: Basic Team
    await filterBySubscriptionText(user, 'Basic');
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(1);

    // Group: ai-grid-users belongs to Premium Team only, so no subscription matches both
    await selectFilterType(user, 'model-access-table-toolbar-option-group');
    await openTypeahead(user);
    await user.click(
      screen.getByRole('option', { name: '42c3e46f-2477-44d7-a85b-d3b43f6b31fa/ai-grid-users' }),
    );
    expect(screen.queryByTestId('subscription-row')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Clear all filters' }).length).toBeGreaterThan(0);

    // Both the toolbar and the filtered empty state expose a clear-filters button
    await user.click(screen.getAllByRole('button', { name: 'Clear all filters' })[0]);
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Basic Team' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Premium Team' })).toBeInTheDocument();
  });
});
