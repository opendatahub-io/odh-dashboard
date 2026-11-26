import { ReadableStream } from 'node:stream/web';
import { TextDecoder, TextEncoder } from 'node:util';
import { K8sStatusError } from '@openshift/dynamic-plugin-sdk-utils';
import { mock403Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { LLMInferenceServiceModel } from '../../types';
import { watchDeploymentList } from '../watchDeploymentList';

const model = (name: string, resourceVersion: string) => ({
  metadata: { name, resourceVersion },
});
const list = (items: ReturnType<typeof model>[], resourceVersion: string, continuation?: string) =>
  ({
    json: async () => ({ items, metadata: { resourceVersion, continue: continuation } }),
  } as Response);
const stream = (...chunks: string[]) =>
  ({
    body: new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
  } as unknown as Response);

describe('watchDeploymentList', () => {
  const originalTextDecoder = globalThis.TextDecoder;
  let controller: AbortController;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: TextDecoder });
    controller = new AbortController();
  });

  afterEach(() => {
    controller.abort();
    jest.useRealTimers();
    Object.defineProperty(globalThis, 'TextDecoder', {
      configurable: true,
      value: originalTextDecoder,
    });
  });

  it('should stop when the HTTP watch is forbidden after a successful list', async () => {
    const item = model('model', '10');
    const denied = new K8sStatusError(mock403Error({}));
    const fetchK8s = jest
      .fn()
      .mockResolvedValueOnce(list([item], '10'))
      .mockRejectedValueOnce(denied);
    const onChange = jest.fn();

    await watchDeploymentList(
      fetchK8s,
      LLMInferenceServiceModel,
      'project',
      { 'app.kubernetes.io/name': 'model' },
      controller.signal,
      onChange,
    );
    await jest.advanceTimersByTimeAsync(20_000);

    const listPath = '/apis/serving.kserve.io/v1alpha2/namespaces/project/llminferenceservices';
    expect(fetchK8s).toHaveBeenCalledTimes(2);
    expect(fetchK8s).toHaveBeenLastCalledWith(
      `${listPath}?watch=true&resourceVersion=10&allowWatchBookmarks=true&timeoutSeconds=30&labelSelector=app.kubernetes.io%2Fname%3Dmodel`,
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(onChange).toHaveBeenNthCalledWith(1, [[item], true, undefined]);
    expect(onChange).toHaveBeenLastCalledWith([[], false, denied]);
  });

  it('should report a transient failure, resume from the resource version, and stop on an error event', async () => {
    const old = model('model', '10');
    const updated = model('model', '11');
    const transient = new Error('Connection failed.');
    const denied = mock403Error({});
    const update = JSON.stringify({ type: 'MODIFIED', object: updated });
    const fetchK8s = jest
      .fn()
      .mockResolvedValueOnce(list([old], '10'))
      .mockRejectedValueOnce(transient)
      .mockResolvedValueOnce(
        stream(
          update.slice(0, 15),
          `${update.slice(15)}\n${JSON.stringify({ type: 'ERROR', object: denied })}\n`,
        ),
      );
    const onChange = jest.fn();
    const finished = watchDeploymentList(
      fetchK8s,
      LLMInferenceServiceModel,
      'project',
      undefined,
      controller.signal,
      onChange,
    );

    await jest.advanceTimersByTimeAsync(5_000);
    await finished;

    expect(fetchK8s).toHaveBeenCalledTimes(3);
    expect(fetchK8s.mock.calls[2][0]).toBe(fetchK8s.mock.calls[1][0]);
    expect(onChange).toHaveBeenCalledWith([[old], true, transient]);
    expect(onChange).toHaveBeenCalledWith([[updated], true, undefined]);
    expect(onChange).toHaveBeenLastCalledWith([
      [],
      false,
      expect.objectContaining({ status: denied }),
    ]);
  });

  it('should add and delete deployments and resume after a bookmark', async () => {
    const existing = model('existing', '10');
    const added = model('added', '11');
    const denied = new K8sStatusError(mock403Error({}));
    const fetchK8s = jest
      .fn()
      .mockResolvedValueOnce(list([existing], '10'))
      .mockResolvedValueOnce(
        stream(
          `${JSON.stringify({ type: 'ADDED', object: added })}\n`,
          `${JSON.stringify({ type: 'DELETED', object: model('existing', '12') })}\n`,
          `${JSON.stringify({
            type: 'BOOKMARK',
            object: { metadata: { resourceVersion: '13' } },
          })}\n`,
        ),
      )
      .mockRejectedValueOnce(denied);
    const onChange = jest.fn();
    const finished = watchDeploymentList(
      fetchK8s,
      LLMInferenceServiceModel,
      'project',
      undefined,
      controller.signal,
      onChange,
    );

    await jest.advanceTimersByTimeAsync(1_000);
    await finished;

    expect(fetchK8s).toHaveBeenCalledTimes(3);
    expect(fetchK8s).toHaveBeenLastCalledWith(
      expect.stringContaining('?watch=true&resourceVersion=13&'),
      expect.anything(),
    );
    expect(onChange.mock.calls.map(([result]) => result)).toEqual([
      [[existing], true, undefined],
      [[existing], true, undefined],
      [[existing, added], true, undefined],
      [[added], true, undefined],
      [[], false, denied],
    ]);
  });

  it('should read all list pages and relist when the watch resource version expires', async () => {
    const expired = new K8sStatusError({ ...mock403Error({}), code: 410 });
    const first = model('first', '9');
    const second = model('second', '10');
    const fetchK8s = jest
      .fn()
      .mockResolvedValueOnce(list([first], '10', 'page-2'))
      .mockResolvedValueOnce(list([second], '10'))
      .mockRejectedValueOnce(expired)
      .mockResolvedValueOnce(list([], '15'))
      .mockImplementationOnce(() => {
        controller.abort();
        return Promise.reject(new Error('Watch cancelled.'));
      });
    const onChange = jest.fn();
    const finished = watchDeploymentList(
      fetchK8s,
      LLMInferenceServiceModel,
      'project',
      undefined,
      controller.signal,
      onChange,
    );

    await jest.advanceTimersByTimeAsync(1_000);
    await finished;

    expect(fetchK8s.mock.calls.map(([url]) => url.split('?')[1])).toEqual([
      'limit=250',
      'limit=250&continue=page-2',
      'watch=true&resourceVersion=10&allowWatchBookmarks=true&timeoutSeconds=30',
      'limit=250',
      'watch=true&resourceVersion=15&allowWatchBookmarks=true&timeoutSeconds=30',
    ]);
    expect(onChange.mock.calls).toEqual([
      [[[first, second], true, undefined]],
      [[[], true, undefined]],
    ]);
  });
});
