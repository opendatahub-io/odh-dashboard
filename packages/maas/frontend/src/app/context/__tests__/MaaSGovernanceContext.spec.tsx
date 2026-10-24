import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { listAllGroups, listAllMaasModels, listSubscriptionsFrom } from '~/app/api/subscriptions';
import { listAuthPolicies } from '~/app/api/auth-policies';
import {
  MaaSGovernanceProvider,
  useMaaSGovernanceContext,
} from '~/app/context/MaaSGovernanceContext';

jest.mock('~/app/api/subscriptions', () => ({
  listAllGroups: jest.fn(),
  listAllMaasModels: jest.fn(),
  listSubscriptionsFrom: jest.fn(),
}));

jest.mock('~/app/api/auth-policies', () => ({
  listAuthPolicies: jest.fn(),
}));

const emptyFetch = () => jest.fn().mockResolvedValue([]);

describe('MaaSGovernanceProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(listSubscriptionsFrom).mockReturnValue(emptyFetch());
    jest.mocked(listAllMaasModels).mockReturnValue(emptyFetch());
    jest.mocked(listAllGroups).mockReturnValue(emptyFetch());
    jest.mocked(listAuthPolicies).mockReturnValue(emptyFetch());
  });

  it('should default to the all-subscriptions endpoint', async () => {
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <MaaSGovernanceProvider>{children}</MaaSGovernanceProvider>
    );

    const { result } = renderHook(useMaaSGovernanceContext, { wrapper });

    await waitFor(() => expect(result.current.subscriptionsLoaded).toBe(true));
    expect(listSubscriptionsFrom).toHaveBeenCalledWith('all-subscriptions');
  });

  it('should use the admin-subscriptions endpoint when requested', async () => {
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <MaaSGovernanceProvider subscriptionsEndpoint="admin-subscriptions">
        {children}
      </MaaSGovernanceProvider>
    );

    const { result } = renderHook(useMaaSGovernanceContext, { wrapper });

    await waitFor(() => expect(result.current.subscriptionsLoaded).toBe(true));
    expect(listSubscriptionsFrom).toHaveBeenCalledWith('admin-subscriptions');
    expect(listSubscriptionsFrom).not.toHaveBeenCalledWith('all-subscriptions');
  });
});
