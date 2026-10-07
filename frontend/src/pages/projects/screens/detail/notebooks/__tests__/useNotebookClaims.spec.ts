import { act, waitFor } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import {
  getResourceClaim,
  getResourceClaimTemplate,
} from '@odh-dashboard/k8s-core/api/resourceClaims';
import { mock403Error, mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { getPodsForNotebook } from '#~/api';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { useNotebookClaims } from '#~/pages/projects/screens/detail/notebooks/useNotebookClaims';

jest.mock('#~/api', () => ({
  getPodsForNotebook: jest.fn(),
}));

jest.mock('@odh-dashboard/k8s-core/api/resourceClaims', () => ({
  getResourceClaim: jest.fn(),
  getResourceClaimTemplate: jest.fn(),
}));

const getPodsForNotebookMock = jest.mocked(getPodsForNotebook);
const getResourceClaimMock = jest.mocked(getResourceClaim);
const getResourceClaimTemplateMock = jest.mocked(getResourceClaimTemplate);

const NAME = 'test-notebook';
const NAMESPACE = 'test-project';
const TEMPLATE = 'gpu-template';
const GENERATED_RC = 'test-notebook-0-gpu-abc12';

const draNotebook = () =>
  mockNotebookK8sResource({
    name: NAME,
    namespace: NAMESPACE,
    resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
    containerClaims: [{ name: 'gpu' }],
  });

/** A Pod whose notebook container consumes the generated claim. */
const draPod = (overrides: Partial<Parameters<typeof mockPodK8sResource>[0]> = {}) =>
  mockPodK8sResource({
    name: `${NAME}-0`,
    namespace: NAMESPACE,
    containerName: NAME,
    resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
    resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }],
    containerClaims: [{ name: 'gpu' }],
    ...overrides,
  });

describe('useNotebookClaims', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch while the row is collapsed', () => {
    const renderResult = testHook(useNotebookClaims)(draNotebook(), { enabled: false });

    expect(renderResult.result.current.podsLoaded).toBe(false);
    expect(renderResult.result.current.containerNames).toEqual([NAME]);
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(getPodsForNotebookMock).not.toHaveBeenCalled();
    expect(getResourceClaimMock).not.toHaveBeenCalled();
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();
  });

  it('should not fetch anything for a workbench without claims', () => {
    const renderResult = testHook(useNotebookClaims)(mockNotebookK8sResource({}), {
      enabled: true,
    });

    expect(renderResult.result.current.group.claims).toEqual([]);
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(getPodsForNotebookMock).not.toHaveBeenCalled();
    expect(getResourceClaimMock).not.toHaveBeenCalled();
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();
  });

  it('should list Pods for the notebook and look up the generated claim from Pod status', async () => {
    const pod = draPod({ nodeName: 'worker-1' });
    const claim = mockResourceClaim({
      name: GENERATED_RC,
      namespace: NAMESPACE,
      allocationResults: [{ request: 'gpu', driver: 'd', pool: 'p', device: 'gpu-0' }],
    });
    getPodsForNotebookMock.mockResolvedValue([pod]);
    getResourceClaimMock.mockResolvedValue(claim);

    const renderResult = testHook(useNotebookClaims)(draNotebook(), {
      enabled: true,
      runningPodUid: pod.metadata.uid,
    });
    await waitFor(() =>
      expect(renderResult.result.current.group.claims[0]?.state.status).toBe('allocated'),
    );

    expect(getPodsForNotebookMock).toHaveBeenCalledWith(
      NAMESPACE,
      NAME,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(getResourceClaimMock).toHaveBeenCalledWith(
      NAMESPACE,
      GENERATED_RC,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();

    const { group, podsLoaded } = renderResult.result.current;
    expect(podsLoaded).toBe(true);
    expect(group.pod).toEqual({ name: `${NAME}-0`, nodeName: 'worker-1' });
    expect(group.claims).toHaveLength(1);
    expect(group.claims[0].resourceClaimName).toBe(GENERATED_RC);
    // Initial render, Pod list loaded, lookup key change (purity reset), claim lookups loaded.
    expect(renderResult).hookToHaveUpdateCount(4);
  });

  it('should prefer the running Pod over a newer one', async () => {
    const running = draPod({
      name: 'running',
      uid: 'running',
      creationTimestamp: '2025-01-01T00:00:00Z',
    });
    const newer = draPod({
      name: 'newer',
      uid: 'newer',
      creationTimestamp: '2026-01-01T00:00:00Z',
    });
    getPodsForNotebookMock.mockResolvedValue([newer, running]);
    getResourceClaimMock.mockResolvedValue(mockResourceClaim({ name: GENERATED_RC }));

    const renderResult = testHook(useNotebookClaims)(draNotebook(), {
      enabled: true,
      runningPodUid: 'running',
    });

    await waitFor(() => expect(renderResult.result.current.group.pod?.name).toBe('running'));
  });

  it.each<[string, Error, string]>([
    ['404', new K8sStatusError(mock404Error({})), 'missing'],
    ['403', new K8sStatusError(mock403Error({})), 'forbidden'],
  ])('should map a %s claim lookup to %s and keep the reference', async (_c, error, status) => {
    getPodsForNotebookMock.mockResolvedValue([draPod()]);
    getResourceClaimMock.mockRejectedValue(error);

    const renderResult = testHook(useNotebookClaims)(draNotebook(), { enabled: true });
    await waitFor(() =>
      expect(renderResult.result.current.group.claims[0]?.state.status).toBe(status),
    );

    expect(renderResult.result.current.group.claims[0].resourceClaimName).toBe(GENERATED_RC);
  });

  it('should fall back to the spec and the template when there is no Pod', async () => {
    const template = mockResourceClaimTemplate({ name: TEMPLATE, namespace: NAMESPACE });
    getPodsForNotebookMock.mockResolvedValue([]);
    getResourceClaimTemplateMock.mockResolvedValue(template);

    const renderResult = testHook(useNotebookClaims)(draNotebook(), { enabled: true });
    await waitFor(() =>
      expect(renderResult.result.current.group.claims[0]?.requestsSource).toBe(
        'resourceClaimTemplate',
      ),
    );

    expect(getResourceClaimMock).not.toHaveBeenCalled();
    expect(getResourceClaimTemplateMock).toHaveBeenCalledWith(
      NAMESPACE,
      TEMPLATE,
      expect.anything(),
    );
    const { group } = renderResult.result.current;
    expect(group.pod).toBeUndefined();
    expect(group.claims[0].resourceClaimName).toBeUndefined();
    expect(group.claims[0].templateState).toEqual({ status: 'loaded', resource: template });
  });

  it('should fall back to the spec and the template when the Pod list fails', async () => {
    const template = mockResourceClaimTemplate({ name: TEMPLATE, namespace: NAMESPACE });
    getPodsForNotebookMock.mockRejectedValue(new K8sStatusError(mock403Error({})));
    getResourceClaimTemplateMock.mockResolvedValue(template);

    const renderResult = testHook(useNotebookClaims)(draNotebook(), { enabled: true });
    await waitFor(() =>
      expect(renderResult.result.current.group.claims[0]?.requestsSource).toBe(
        'resourceClaimTemplate',
      ),
    );

    const { group, podsLoaded, podsError } = renderResult.result.current;
    expect(podsLoaded).toBe(false);
    expect(podsError).toBeInstanceOf(K8sStatusError);
    expect(group.pod).toBeUndefined();
    expect(group.claims[0].resourceClaimName).toBeUndefined();
    expect(getResourceClaimTemplateMock).toHaveBeenCalledWith(
      NAMESPACE,
      TEMPLATE,
      expect.anything(),
    );
    expect(getResourceClaimMock).not.toHaveBeenCalled();
  });

  it('should still resolve a claim the notebook container does not consume', async () => {
    getPodsForNotebookMock.mockResolvedValue([draPod({ containerClaims: undefined })]);
    getResourceClaimMock.mockResolvedValue(mockResourceClaim({ name: GENERATED_RC }));

    const renderResult = testHook(useNotebookClaims)(draNotebook(), { enabled: true });
    await waitFor(() =>
      expect(renderResult.result.current.group.claims[0]?.state.status).toBe('pending'),
    );

    const [claim] = renderResult.result.current.group.claims;
    expect(claim.reference.consumers).toEqual([]);
    expect(claim.resourceClaimName).toBe(GENERATED_RC);
    expect(getResourceClaimMock).toHaveBeenCalledWith(NAMESPACE, GENERATED_RC, expect.anything());
  });

  it('should arm the poll only while expanded and refetch on the interval', async () => {
    jest.useFakeTimers();
    try {
      getPodsForNotebookMock.mockResolvedValue([draPod()]);
      getResourceClaimMock.mockResolvedValue(mockResourceClaim({ name: GENERATED_RC }));
      const notebook = draNotebook();

      const renderResult = testHook(useNotebookClaims)(notebook, {
        enabled: false,
        refreshRate: 1000,
      });
      // Collapsed: no request and no timer, not even a no-op tick.
      expect(jest.getTimerCount()).toBe(0);
      expect(getPodsForNotebookMock).not.toHaveBeenCalled();

      renderResult.rerender(notebook, { enabled: true, refreshRate: 1000 });
      expect(getPodsForNotebookMock).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(renderResult.result.current.group.claims[0]?.state.status).toBe('pending'),
      );
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(getPodsForNotebookMock).toHaveBeenCalledTimes(2);

      renderResult.rerender(notebook, { enabled: false, refreshRate: 1000 });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should abort the Pod list and reset when the row collapses', () => {
    getPodsForNotebookMock.mockImplementation(
      () =>
        new Promise(() => {
          // Never settles so the request is still in flight when collapsed.
        }),
    );
    const notebook = draNotebook();

    const renderResult = testHook(useNotebookClaims)(notebook, { enabled: true });
    const { signal } = getPodsForNotebookMock.mock.calls[0][2] ?? {};
    expect(signal?.aborted).toBe(false);

    renderResult.rerender(notebook, { enabled: false });

    expect(signal?.aborted).toBe(true);
    expect(renderResult.result.current.podsLoaded).toBe(false);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(getPodsForNotebookMock).toHaveBeenCalledTimes(1);
  });
});
