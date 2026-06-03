import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteSubscriptionModal from '~/app/pages/subscriptions/DeleteSubscriptionModal';
import { MaaSSubscription } from '~/app/types/subscriptions';

jest.mock('~/app/hooks/useDeleteSubscription', () => ({
  useDeleteSubscription: () => ({
    isDeleting: false,
    error: undefined,
    deleteSubscriptionCallback: jest.fn(),
  }),
}));

const mockSubscription = (
  overrides: Partial<MaaSSubscription> = {},
): MaaSSubscription => ({
  name: 'prod-api-access',
  namespace: 'test-ns',
  owner: { groups: [] },
  modelRefs: [],
  ...overrides,
});

describe('DeleteSubscriptionModal', () => {
  it('should display displayName when available', () => {
    render(
      <DeleteSubscriptionModal
        subscription={mockSubscription({ displayName: 'Production API Access' })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Production API Access')).toBeInTheDocument();
    expect(screen.queryByText('prod-api-access')).not.toBeInTheDocument();
  });

  it('should fall back to name when displayName is not set', () => {
    render(
      <DeleteSubscriptionModal
        subscription={mockSubscription()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('prod-api-access')).toBeInTheDocument();
  });
});
