import { testHook } from '@odh-dashboard/jest-config/hooks';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import {
  getResourceClaim,
  getResourceClaimTemplate,
} from '@odh-dashboard/k8s-core/api/resourceClaims';
import {
  mock403Error,
  mock404Error,
  mock500Error,
} from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { useResourceClaimLookups } from '../useResourceClaimLookups';

jest.mock('@odh-dashboard/k8s-core/api/resourceClaims', () => ({
  getResourceClaim: jest.fn(),
  getResourceClaimTemplate: jest.fn(),
}));

const getResourceClaimMock = jest.mocked(getResourceClaim);
const getResourceClaimTemplateMock = jest.mocked(getResourceClaimTemplate);

const NAMESPACE = 'a-test-project';
const EMPTY = { claims: {}, templates: {} };

describe('useResourceClaimLookups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch while disabled', () => {
    const renderResult = testHook(useResourceClaimLookups)({
      namespace: NAMESPACE,
      claimNames: ['rc-1'],
      templateNames: ['rct-1'],
      enabled: false,
    });

    expect(renderResult).hookToStrictEqual(EMPTY);
    expect(getResourceClaimMock).not.toHaveBeenCalled();
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();
  });

  it('should not fetch without names or namespace', () => {
    testHook(useResourceClaimLookups)({
      namespace: NAMESPACE,
      claimNames: [],
      templateNames: [],
      enabled: true,
    });
    testHook(useResourceClaimLookups)({
      namespace: undefined,
      claimNames: ['rc-1'],
      templateNames: [],
      enabled: true,
    });

    expect(getResourceClaimMock).not.toHaveBeenCalled();
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();
  });

  it('should fetch every unique name in the workload namespace', async () => {
    const claim = mockResourceClaim({ name: 'rc-1', namespace: NAMESPACE });
    const template = mockResourceClaimTemplate({ name: 'rct-1', namespace: NAMESPACE });
    getResourceClaimMock.mockResolvedValue(claim);
    getResourceClaimTemplateMock.mockResolvedValue(template);

    const renderResult = testHook(useResourceClaimLookups)({
      namespace: NAMESPACE,
      claimNames: ['rc-1', 'rc-1'],
      templateNames: ['rct-1'],
      enabled: true,
    });
    expect(renderResult).hookToStrictEqual(EMPTY);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({
      claims: { 'rc-1': { status: 'loaded', resource: claim } },
      templates: { 'rct-1': { status: 'loaded', resource: template } },
    });
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(getResourceClaimMock).toHaveBeenCalledTimes(1);
    expect(getResourceClaimMock).toHaveBeenCalledWith(
      NAMESPACE,
      'rc-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(getResourceClaimTemplateMock).toHaveBeenCalledWith(
      NAMESPACE,
      'rct-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('should keep loaded siblings and map 404, 403 and other failures separately', async () => {
    const loaded = mockResourceClaim({ name: 'ok', namespace: NAMESPACE });
    const serverError = new K8sStatusError(mock500Error({}));
    getResourceClaimMock.mockImplementation((_ns, name) => {
      switch (name) {
        case 'gone':
          return Promise.reject(new K8sStatusError(mock404Error({})));
        case 'denied':
          return Promise.reject(new K8sStatusError(mock403Error({})));
        case 'broken':
          return Promise.reject(serverError);
        default:
          return Promise.resolve(loaded);
      }
    });

    const renderResult = testHook(useResourceClaimLookups)({
      namespace: NAMESPACE,
      claimNames: ['ok', 'gone', 'denied', 'broken'],
      templateNames: [],
      enabled: true,
    });
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({
      claims: {
        ok: { status: 'loaded', resource: loaded },
        gone: { status: 'missing' },
        denied: { status: 'forbidden' },
        broken: { status: 'error', error: serverError },
      },
      templates: {},
    });
  });

  it('should abort the in-flight request and reset when disabled', () => {
    getResourceClaimMock.mockImplementation(
      () =>
        new Promise(() => {
          // Never settles so the request is still in flight when disabled.
        }),
    );

    const renderResult = testHook(useResourceClaimLookups)({
      namespace: NAMESPACE,
      claimNames: ['rc-1'],
      templateNames: [],
      enabled: true,
    });
    const { signal } = getResourceClaimMock.mock.calls[0][2] ?? {};
    expect(signal?.aborted).toBe(false);

    renderResult.rerender({
      namespace: NAMESPACE,
      claimNames: ['rc-1'],
      templateNames: [],
      enabled: false,
    });

    expect(signal?.aborted).toBe(true);
    expect(renderResult).hookToStrictEqual(EMPTY);
    expect(getResourceClaimMock).toHaveBeenCalledTimes(1);
  });

  it('should mark only the name whose fetch throws synchronously as errored', async () => {
    const failure = new Error('network down');
    const template = mockResourceClaimTemplate({ name: 'rct-1', namespace: NAMESPACE });
    getResourceClaimMock.mockImplementation(() => {
      throw failure;
    });
    getResourceClaimTemplateMock.mockResolvedValue(template);

    const renderResult = testHook(useResourceClaimLookups)({
      namespace: NAMESPACE,
      claimNames: ['rc-1'],
      templateNames: ['rct-1'],
      enabled: true,
    });
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({
      claims: { 'rc-1': { status: 'error', error: failure } },
      templates: { 'rct-1': { status: 'loaded', resource: template } },
    });
  });

  it('should abort the previous namespace and never show its claims for the new one', async () => {
    const first = mockResourceClaim({ name: 'rc-1', namespace: 'project-a' });
    const second = mockResourceClaim({ name: 'rc-1', namespace: 'project-b' });
    let resolveFirst: (claim: typeof first) => void = () => undefined;
    getResourceClaimMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(second);

    const renderResult = testHook(useResourceClaimLookups)({
      namespace: 'project-a',
      claimNames: ['rc-1'],
      templateNames: [],
      enabled: true,
    });
    const { signal: firstSignal } = getResourceClaimMock.mock.calls[0][2] ?? {};

    renderResult.rerender({
      namespace: 'project-b',
      claimNames: ['rc-1'],
      templateNames: [],
      enabled: true,
    });

    expect(firstSignal?.aborted).toBe(true);
    expect(renderResult).hookToStrictEqual(EMPTY);
    expect(getResourceClaimMock).toHaveBeenLastCalledWith('project-b', 'rc-1', expect.anything());
    // The late project-a result is dropped; only project-b data is ever returned.
    resolveFirst(first);
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({
      claims: { 'rc-1': { status: 'loaded', resource: second } },
      templates: {},
    });
  });

  it('should keep the state of unchanged names while a changed key refetches', async () => {
    const claim1 = mockResourceClaim({ name: 'rc-1', namespace: NAMESPACE });
    const claim2 = mockResourceClaim({ name: 'rc-2', namespace: NAMESPACE });
    getResourceClaimMock.mockImplementation((_ns, name) =>
      Promise.resolve(name === 'rc-1' ? claim1 : claim2),
    );

    const renderResult = testHook(useResourceClaimLookups)({
      namespace: NAMESPACE,
      claimNames: ['rc-1'],
      templateNames: [],
      enabled: true,
    });
    await renderResult.waitForNextUpdate();

    renderResult.rerender({
      namespace: NAMESPACE,
      claimNames: ['rc-1', 'rc-2'],
      templateNames: [],
      enabled: true,
    });
    // rc-1 keeps its loaded state; rc-2 is absent (loading) until the new batch settles.
    expect(renderResult).hookToStrictEqual({
      claims: { 'rc-1': { status: 'loaded', resource: claim1 } },
      templates: {},
    });
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({
      claims: {
        'rc-1': { status: 'loaded', resource: claim1 },
        'rc-2': { status: 'loaded', resource: claim2 },
      },
      templates: {},
    });

    // A name that leaves the key is dropped at once.
    renderResult.rerender({
      namespace: NAMESPACE,
      claimNames: ['rc-2'],
      templateNames: [],
      enabled: true,
    });
    expect(renderResult).hookToStrictEqual({
      claims: { 'rc-2': { status: 'loaded', resource: claim2 } },
      templates: {},
    });
    await renderResult.waitForNextUpdate();
  });

  it('should drop retained states on collapse so a re-expand starts fresh', async () => {
    const claim = mockResourceClaim({ name: 'rc-1', namespace: NAMESPACE });
    getResourceClaimMock.mockResolvedValue(claim);
    const args = { namespace: NAMESPACE, claimNames: ['rc-1'], templateNames: [] };

    const renderResult = testHook(useResourceClaimLookups)({ ...args, enabled: true });
    await renderResult.waitForNextUpdate();
    renderResult.rerender({ ...args, enabled: false });
    expect(renderResult).hookToStrictEqual(EMPTY);

    renderResult.rerender({ ...args, enabled: true });
    expect(renderResult).hookToStrictEqual(EMPTY);
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({
      claims: { 'rc-1': { status: 'loaded', resource: claim } },
      templates: {},
    });
    expect(getResourceClaimMock).toHaveBeenCalledTimes(2);
  });

  it('should not refetch when the same names arrive in a new array', async () => {
    getResourceClaimMock.mockResolvedValue(mockResourceClaim({ name: 'rc-1' }));

    const renderResult = testHook(useResourceClaimLookups)({
      namespace: NAMESPACE,
      claimNames: ['rc-1'],
      templateNames: [],
      enabled: true,
    });
    await renderResult.waitForNextUpdate();
    renderResult.rerender({
      namespace: NAMESPACE,
      claimNames: ['rc-1'],
      templateNames: [],
      enabled: true,
    });

    expect(getResourceClaimMock).toHaveBeenCalledTimes(1);
  });
});
