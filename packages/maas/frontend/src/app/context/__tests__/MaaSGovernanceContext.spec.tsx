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

  it('should fetch every data source by default', async () => {
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <MaaSGovernanceProvider>{children}</MaaSGovernanceProvider>
    );

    const { result } = renderHook(useMaaSGovernanceContext, { wrapper });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(listAllMaasModels).toHaveBeenCalled();
    expect(listAllGroups).toHaveBeenCalled();
    expect(listAuthPolicies).toHaveBeenCalled();
  });

  it('should skip the Kubernetes-backed fetches when subscriptions only', async () => {
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <MaaSGovernanceProvider subscriptionsEndpoint="admin-subscriptions" subscriptionsOnly>
        {children}
      </MaaSGovernanceProvider>
    );

    const { result } = renderHook(useMaaSGovernanceContext, { wrapper });

    await waitFor(() => expect(result.current.subscriptionsLoaded).toBe(true));
    expect(listSubscriptionsFrom).toHaveBeenCalledWith('admin-subscriptions');
    expect(listAuthPolicies).not.toHaveBeenCalled();
    expect(listAllMaasModels).not.toHaveBeenCalled();
    expect(listAllGroups).not.toHaveBeenCalled();
  });

  it('should report skipped fetches as loaded with empty data', async () => {
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <MaaSGovernanceProvider subscriptionsOnly>{children}</MaaSGovernanceProvider>
    );

    const { result } = renderHook(useMaaSGovernanceContext, { wrapper });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.policiesLoaded).toBe(true);
    expect(result.current.modelRefsLoaded).toBe(true);
    expect(result.current.groupsLoaded).toBe(true);
    expect(result.current.policies).toEqual([]);
    expect(result.current.modelRefs).toEqual([]);
    // The synthetic system:authenticated entry is still added for consumers that read groups.
    expect(result.current.groups).toEqual(['system:authenticated']);
    expect(result.current.error).toBeUndefined();
  });
});
