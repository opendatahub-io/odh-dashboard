import type { V1SelfSubjectAccessReview } from '@kubernetes/client-node';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../../types';
import { createSelfSubjectAccessReview } from '../../../../utils/authUtils';
import { getClusterStatus, getDashboardConfig } from '../../../../utils/resourceUtils';
import { NamespaceApplicationCase } from '../const';
import { applyNamespaceChange } from '../namespaceUtils';

jest.mock('../../../../utils/resourceUtils', () => ({
  getDashboardConfig: jest.fn(),
  getClusterStatus: jest.fn(),
}));

jest.mock('../../../../utils/authUtils', () => ({
  createSelfSubjectAccessReview: jest.fn(),
}));

const mockGetDashboardConfig = jest.mocked(getDashboardConfig);
const mockGetClusterStatus = jest.mocked(getClusterStatus);
const mockCreateSelfSubjectAccessReview = jest.mocked(createSelfSubjectAccessReview);

const KUEUE_MANAGED_LABEL = 'kueue.openshift.io/managed';

describe('applyNamespaceChange — DSG creation Kueue labeling', () => {
  const patchNamespace = jest.fn();
  const request = {} as OauthFastifyRequest;
  const fastify = {
    kube: { coreV1Api: { patchNamespace } },
    log: { error: jest.fn() },
  } as unknown as KubeFastifyInstance;

  const mockDashboardConfig = (disableKueue: boolean) =>
    mockGetDashboardConfig.mockReturnValue({
      spec: { dashboardConfig: { disableKueue } },
    } as ReturnType<typeof getDashboardConfig>);

  const mockKueueManagementState = (managementState?: 'Managed' | 'Unmanaged' | 'Removed') =>
    mockGetClusterStatus.mockReturnValue(
      (managementState
        ? { components: { kueue: { managementState } }, conditions: [] }
        : undefined) as ReturnType<typeof getClusterStatus>,
    );

  const applyDsgCreation = () =>
    applyNamespaceChange(fastify, request, 'my-project', NamespaceApplicationCase.DSG_CREATION);

  const appliedLabels = (): Record<string, string> =>
    patchNamespace.mock.calls[0][1].metadata.labels;

  beforeEach(() => {
    jest.clearAllMocks();
    patchNamespace.mockResolvedValue({});
    mockCreateSelfSubjectAccessReview.mockResolvedValue({
      status: { allowed: true },
    } as V1SelfSubjectAccessReview);
  });

  it.each(['Managed', 'Unmanaged'] as const)(
    'labels the project as Kueue-managed when the flag is off and Kueue is %s',
    async (managementState) => {
      mockDashboardConfig(false);
      mockKueueManagementState(managementState);

      await expect(applyDsgCreation()).resolves.toEqual({ applied: true });

      expect(appliedLabels()).toEqual({
        'opendatahub.io/dashboard': 'true',
        [KUEUE_MANAGED_LABEL]: 'true',
      });
    },
  );

  it('does not label the project when Kueue is not installed in the DSC', async () => {
    mockDashboardConfig(false);
    mockKueueManagementState('Removed');

    await expect(applyDsgCreation()).resolves.toEqual({ applied: true });

    expect(appliedLabels()).toEqual({ 'opendatahub.io/dashboard': 'true' });
  });

  it('does not label the project when the DSC status is unavailable', async () => {
    mockDashboardConfig(false);
    mockKueueManagementState();

    await expect(applyDsgCreation()).resolves.toEqual({ applied: true });

    expect(appliedLabels()).toEqual({ 'opendatahub.io/dashboard': 'true' });
  });

  it('does not label the project when the admin disabled Kueue', async () => {
    mockDashboardConfig(true);
    mockKueueManagementState('Managed');

    await expect(applyDsgCreation()).resolves.toEqual({ applied: true });

    expect(appliedLabels()).toEqual({ 'opendatahub.io/dashboard': 'true' });
  });
});
