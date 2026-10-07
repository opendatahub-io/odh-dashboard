import { testHook } from '@odh-dashboard/jest-config/hooks';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { getResourceClaimTemplate } from '@odh-dashboard/k8s-core/api/resourceClaims';
import {
  mock403Error,
  mock404Error,
  mock500Error,
} from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { useResourceClaimTemplateLookup } from '../useResourceClaimTemplateLookup';

jest.mock('@odh-dashboard/k8s-core/api/resourceClaims', () => ({
  getResourceClaimTemplate: jest.fn(),
}));

const getResourceClaimTemplateMock = jest.mocked(getResourceClaimTemplate);

describe('useResourceClaimTemplateLookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should stay idle and not fetch while disabled', () => {
    const renderResult = testHook(useResourceClaimTemplateLookup)({
      templateName: 'single-gpu',
      namespace: 'a-test-project',
      enabled: false,
    });

    expect(renderResult).hookToStrictEqual({ status: 'idle' });
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();
  });

  it('should stay idle and not fetch without a template name', () => {
    const renderResult = testHook(useResourceClaimTemplateLookup)({
      templateName: undefined,
      namespace: 'a-test-project',
      enabled: true,
    });

    expect(renderResult).hookToStrictEqual({ status: 'idle' });
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();
  });

  it('should report noNamespace and not fetch when the workload project is unknown', () => {
    const renderResult = testHook(useResourceClaimTemplateLookup)({
      templateName: 'single-gpu',
      namespace: undefined,
      enabled: true,
    });

    expect(renderResult).hookToStrictEqual({ status: 'noNamespace' });
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();
  });

  it('should fetch from the workload namespace and resolve to loaded', async () => {
    const template = mockResourceClaimTemplate({ name: 'single-gpu', namespace: 'a-test-project' });
    getResourceClaimTemplateMock.mockResolvedValue(template);

    const renderResult = testHook(useResourceClaimTemplateLookup)({
      templateName: 'single-gpu',
      namespace: 'a-test-project',
      enabled: true,
    });

    expect(renderResult).hookToStrictEqual({ status: 'loading' });
    expect(renderResult).hookToHaveUpdateCount(1);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({ status: 'loaded', resource: template });
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(getResourceClaimTemplateMock).toHaveBeenCalledTimes(1);
    expect(getResourceClaimTemplateMock).toHaveBeenCalledWith(
      'a-test-project',
      'single-gpu',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it.each<[string, Error, string]>([
    ['404', new K8sStatusError(mock404Error({})), 'missing'],
    ['403', new K8sStatusError(mock403Error({})), 'forbidden'],
  ])('should map a %s to the %s state', async (_code, error, status) => {
    getResourceClaimTemplateMock.mockRejectedValue(error);

    const renderResult = testHook(useResourceClaimTemplateLookup)({
      templateName: 'single-gpu',
      namespace: 'a-test-project',
      enabled: true,
    });
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({ status });
  });

  it('should keep other failures as a generic error', async () => {
    const error = new K8sStatusError(mock500Error({}));
    getResourceClaimTemplateMock.mockRejectedValue(error);

    const renderResult = testHook(useResourceClaimTemplateLookup)({
      templateName: 'single-gpu',
      namespace: 'a-test-project',
      enabled: true,
    });
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({ status: 'error', error });
  });

  it('should fetch only once enabled and return to idle when disabled again', async () => {
    const template = mockResourceClaimTemplate({ name: 'single-gpu', namespace: 'a-test-project' });
    getResourceClaimTemplateMock.mockResolvedValue(template);

    const renderResult = testHook(useResourceClaimTemplateLookup)({
      templateName: 'single-gpu',
      namespace: 'a-test-project',
      enabled: false,
    });
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();

    renderResult.rerender({
      templateName: 'single-gpu',
      namespace: 'a-test-project',
      enabled: true,
    });
    expect(renderResult).hookToStrictEqual({ status: 'loading' });
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({ status: 'loaded', resource: template });
    expect(getResourceClaimTemplateMock).toHaveBeenCalledTimes(1);

    renderResult.rerender({
      templateName: 'single-gpu',
      namespace: 'a-test-project',
      enabled: false,
    });
    expect(renderResult).hookToStrictEqual({ status: 'idle' });
    expect(getResourceClaimTemplateMock).toHaveBeenCalledTimes(1);
  });

  it('should drop the previous result and refetch when the namespace changes', async () => {
    const first = mockResourceClaimTemplate({ name: 'single-gpu', namespace: 'project-a' });
    const second = mockResourceClaimTemplate({ name: 'single-gpu', namespace: 'project-b' });
    getResourceClaimTemplateMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const renderResult = testHook(useResourceClaimTemplateLookup)({
      templateName: 'single-gpu',
      namespace: 'project-a',
      enabled: true,
    });
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({ status: 'loaded', resource: first });

    renderResult.rerender({ templateName: 'single-gpu', namespace: 'project-b', enabled: true });
    expect(renderResult).hookToStrictEqual({ status: 'loading' });
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({ status: 'loaded', resource: second });
    expect(getResourceClaimTemplateMock).toHaveBeenLastCalledWith(
      'project-b',
      'single-gpu',
      expect.anything(),
    );
  });

  it('should abort an in-flight request when disabled before it settles', () => {
    getResourceClaimTemplateMock.mockImplementation(
      () =>
        new Promise(() => {
          // Never settles so the request is still in flight when disabled.
        }),
    );

    const renderResult = testHook(useResourceClaimTemplateLookup)({
      templateName: 'single-gpu',
      namespace: 'a-test-project',
      enabled: true,
    });
    const { signal } = getResourceClaimTemplateMock.mock.calls[0][2] ?? {};
    expect(signal?.aborted).toBe(false);

    renderResult.rerender({
      templateName: 'single-gpu',
      namespace: 'a-test-project',
      enabled: false,
    });

    expect(signal?.aborted).toBe(true);
    expect(renderResult).hookToStrictEqual({ status: 'idle' });
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should abort the previous request when the namespace changes', () => {
    getResourceClaimTemplateMock.mockImplementation(
      () =>
        new Promise(() => {
          // Never settles so both requests stay in flight.
        }),
    );

    const renderResult = testHook(useResourceClaimTemplateLookup)({
      templateName: 'single-gpu',
      namespace: 'project-a',
      enabled: true,
    });
    const { signal: firstSignal } = getResourceClaimTemplateMock.mock.calls[0][2] ?? {};

    renderResult.rerender({ templateName: 'single-gpu', namespace: 'project-b', enabled: true });

    const { signal: secondSignal } = getResourceClaimTemplateMock.mock.calls[1][2] ?? {};
    expect(firstSignal?.aborted).toBe(true);
    expect(secondSignal?.aborted).toBe(false);
    expect(renderResult).hookToStrictEqual({ status: 'loading' });
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
