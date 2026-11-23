import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ExpandedModelContent from '~/app/pages/maas-governance/overview/ExpandedModelContent';
import { ModelOverviewPolicy, ModelOverviewSubscription } from '~/app/types/subscriptions';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  useAccessReview: (attributes: { verb: string }) => [mockAllowedVerbs.has(attributes.verb), true],
}));

jest.mock('~/app/context/MaaSGovernanceContext', () => ({
  useMaaSGovernanceContext: () => ({ refresh: mockRefresh }),
}));

jest.mock('~/app/hooks/useGovernanceAffectedModels', () => ({
  useGovernanceResourceAffectedModels: () => ({ affectedModels: [], overviewLoaded: true }),
}));

jest.mock('~/app/shared/Phase/PhaseLabel', () => ({
  __esModule: true,
  default: () => <span data-testid="mock-phase-label" />,
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('~/app/pages/subscriptions/DeleteSubscriptionModal', () => ({
  __esModule: true,
  default: ({
    subscription,
    onClose,
  }: {
    subscription: { name: string };
    onClose: (deleted?: boolean) => void;
  }) => (
    <div data-testid={`delete-subscription-modal-${subscription.name}`}>
      <button type="button" onClick={() => onClose(false)}>
        Cancel delete
      </button>
      <button type="button" onClick={() => onClose(true)}>
        Confirm delete
      </button>
    </div>
  ),
}));

jest.mock('~/app/pages/auth-policies/DeleteAuthPolicyModal', () => ({
  __esModule: true,
  default: ({
    authPolicy,
    onClose,
  }: {
    authPolicy: { name: string };
    onClose: (deleted?: boolean) => void;
  }) => (
    <div data-testid={`delete-policy-modal-${authPolicy.name}`}>
      <button type="button" onClick={() => onClose(false)}>
        Cancel delete
      </button>
      <button type="button" onClick={() => onClose(true)}>
        Confirm delete
      </button>
    </div>
  ),
}));

const mockNavigate = jest.fn();
const mockRefresh = jest.fn();
let mockAllowedVerbs: Set<string>;

const mockSubscription = (
  overrides?: Partial<ModelOverviewSubscription>,
): ModelOverviewSubscription => ({
  name: 'sub-granite',
  namespace: 'test-namespace',
  groups: ['team-a'],
  ...overrides,
});

const mockPolicy = (overrides?: Partial<ModelOverviewPolicy>): ModelOverviewPolicy => ({
  name: 'policy-granite',
  namespace: 'test-namespace',
  groups: ['team-a'],
  ...overrides,
});

const openActionsMenu = async (testId: string): Promise<void> => {
  fireEvent.click(within(screen.getByTestId(testId)).getByRole('button'));
  await screen.findByRole('menuitem', { name: 'View details' });
};

describe('ExpandedModelContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAllowedVerbs = new Set(['update', 'delete']);
  });

  it('should show View details, Edit, and Delete for subscriptions and policies when mutations are allowed', async () => {
    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[mockSubscription()]}
          policies={[mockPolicy()]}
          returnTo="/maas-governance/overview"
        />
      </MemoryRouter>,
    );

    await openActionsMenu('overview-subscription-actions-sub-granite');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();

    await openActionsMenu('overview-policy-actions-policy-granite');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('should hide Edit and Delete when the access review denies the mutations', async () => {
    mockAllowedVerbs = new Set();

    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[mockSubscription()]}
          policies={[mockPolicy()]}
          returnTo="/maas-governance/overview"
        />
      </MemoryRouter>,
    );

    await openActionsMenu('overview-subscription-actions-sub-granite');
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('should disable Edit and Delete while a resource is being deleted', async () => {
    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[mockSubscription({ deletionTimestamp: '2026-11-23T00:00:00Z' })]}
          policies={[mockPolicy({ deletionTimestamp: '2026-11-23T00:00:00Z' })]}
          returnTo="/maas-governance/overview"
        />
      </MemoryRouter>,
    );

    await openActionsMenu('overview-subscription-actions-sub-granite');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeDisabled();
  });

  it('should navigate to the edit route with overview return state for both resource types', async () => {
    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[mockSubscription()]}
          policies={[mockPolicy()]}
          returnTo="/maas-governance/overview"
        />
      </MemoryRouter>,
    );

    await openActionsMenu('overview-subscription-actions-sub-granite');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/maas/maas-governance/subscriptions/edit/sub-granite',
      expect.objectContaining({
        state: expect.objectContaining({ returnTo: '/maas/maas-governance/overview' }),
      }),
    );

    await openActionsMenu('overview-policy-actions-policy-granite');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/maas/maas-governance/auth-policies/edit/policy-granite',
      expect.objectContaining({
        state: expect.objectContaining({ returnTo: '/maas/maas-governance/overview' }),
      }),
    );
  });

  it('should close the delete modal without refreshing when deletion is cancelled', async () => {
    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[mockSubscription()]}
          policies={[mockPolicy()]}
          returnTo="/maas-governance/overview"
        />
      </MemoryRouter>,
    );

    await openActionsMenu('overview-subscription-actions-sub-granite');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(await screen.findByText('Cancel delete'));

    expect(screen.queryByTestId('delete-subscription-modal-sub-granite')).not.toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('should refresh governance data after a subscription is deleted', async () => {
    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[mockSubscription()]}
          policies={[mockPolicy()]}
          returnTo="/maas-governance/overview"
        />
      </MemoryRouter>,
    );

    await openActionsMenu('overview-subscription-actions-sub-granite');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(await screen.findByText('Confirm delete'));

    expect(screen.queryByTestId('delete-subscription-modal-sub-granite')).not.toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should not refresh governance data when a subscription deletion fails', async () => {
    jest.mocked(mockNavigate).mockClear();

    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[mockSubscription()]}
          policies={[mockPolicy()]}
          returnTo="/maas-governance/overview"
        />
      </MemoryRouter>,
    );

    await openActionsMenu('overview-subscription-actions-sub-granite');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    // A failed deletion reports onClose without the deleted flag
    fireEvent.click(await screen.findByText('Cancel delete'));

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('should refresh governance data after a policy is deleted', async () => {
    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[mockSubscription()]}
          policies={[mockPolicy()]}
          returnTo="/maas-governance/overview"
        />
      </MemoryRouter>,
    );

    await openActionsMenu('overview-policy-actions-policy-granite');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(await screen.findByText('Confirm delete'));

    expect(screen.queryByTestId('delete-policy-modal-policy-granite')).not.toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
