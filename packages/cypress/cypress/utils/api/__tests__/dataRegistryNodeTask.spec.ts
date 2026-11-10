import { EventEmitter } from 'events';
import type * as http from 'http';
import { describe, expect, it, jest } from '@jest/globals';
import {
  createDataRegistryDeleteTask,
  requestDataRegistryDelete as sendDataRegistryDelete,
} from '../dataRegistryNodeTask';

const config = {
  baseUrl: 'https://dashboard.example/console',
  env: { ODH_DASHBOARD_CANONICAL_URL: 'https://canonical.example/dashboard' },
};

const validPath = '/data-registry/api/v1/project/namespaces/collection';

type DeleteResult =
  | { response: { status: number; body: unknown; headers: Record<string, unknown> } }
  | { transportError: string }
  | { tokenError: string };

const createTask = () => {
  const getOpenShiftToken = jest.fn<() => Promise<string | { tokenError: string }>>();
  getOpenShiftToken.mockResolvedValue('oc-token');
  const requestDataRegistryDelete =
    jest.fn<(requestUrl: URL, token: string) => Promise<DeleteResult>>();
  requestDataRegistryDelete.mockResolvedValue({
    response: { status: 204, body: undefined, headers: {} },
  });
  const task = createDataRegistryDeleteTask(config, {
    getOpenShiftToken,
    requestDataRegistryDelete,
  });
  return { task, getOpenShiftToken, requestDataRegistryDelete };
};

describe('createDataRegistryDeleteTask', () => {
  it('should send DELETE requests for both configured dashboard origins', async () => {
    for (const origin of ['https://dashboard.example', 'https://canonical.example']) {
      const { task, getOpenShiftToken, requestDataRegistryDelete } = createTask();

      await expect(task({ origin, path: validPath })).resolves.toEqual({
        response: { status: 204, body: undefined, headers: {} },
      });

      expect(getOpenShiftToken).toHaveBeenCalledTimes(1);
      expect(requestDataRegistryDelete).toHaveBeenCalledWith(
        new URL(`${origin}${validPath}`),
        'oc-token',
      );
    }
  });

  it('should reject malformed task arguments before obtaining a token', async () => {
    const { task, getOpenShiftToken, requestDataRegistryDelete } = createTask();

    await expect(task({ origin: 'https://dashboard.example', path: 42 })).resolves.toEqual({
      transportError: 'Invalid Data Registry DELETE request arguments',
    });

    expect(getOpenShiftToken).not.toHaveBeenCalled();
    expect(requestDataRegistryDelete).not.toHaveBeenCalled();
  });

  it('should reject untrusted origins and invalid paths before obtaining a token', async () => {
    const invalidRequests = [
      ['https://attacker.example', validPath],
      ['https://dashboard.example/console', validPath],
      ['ftp://dashboard.example', validPath],
      ['https://dashboard.example', '/admin'],
      ['https://dashboard.example', '/data-registry/api/v1/../admin'],
      ['https://dashboard.example', `${validPath}?delete=true`],
      ['https://dashboard.example', `${validPath}#resource`],
      ['https://dashboard.example', `https://attacker.example${validPath}`],
    ];

    for (const [origin, path] of invalidRequests) {
      const { task, getOpenShiftToken, requestDataRegistryDelete } = createTask();

      await expect(task({ origin, path })).resolves.toHaveProperty('transportError');

      expect(getOpenShiftToken).not.toHaveBeenCalled();
      expect(requestDataRegistryDelete).not.toHaveBeenCalled();
    }
  });

  it('should return token errors without sending a request', async () => {
    const { task, getOpenShiftToken, requestDataRegistryDelete } = createTask();
    getOpenShiftToken.mockResolvedValue({ tokenError: 'oc is not logged in' });

    await expect(task({ origin: 'https://dashboard.example', path: validPath })).resolves.toEqual({
      tokenError: 'oc is not logged in',
    });

    expect(requestDataRegistryDelete).not.toHaveBeenCalled();
  });

  it('should return transport errors from the DELETE request', async () => {
    const { task, requestDataRegistryDelete } = createTask();
    requestDataRegistryDelete.mockResolvedValue({ transportError: 'connection reset' });

    await expect(task({ origin: 'https://dashboard.example', path: validPath })).resolves.toEqual({
      transportError: 'connection reset',
    });
  });
});

describe('requestDataRegistryDelete', () => {
  const requestUrl = new URL('http://dashboard.example/data-registry/api/v1/project');

  it('should parse the response status, JSON body, and content type', async () => {
    const responseBody = JSON.stringify({ deleted: true });
    const response = Object.assign(new EventEmitter(), {
      statusCode: 202,
      headers: { 'content-type': 'application/json' },
    });
    const request = Object.assign(new EventEmitter(), {
      end: () => {
        responseHandler(response as unknown as http.IncomingMessage);
        response.emit('data', Buffer.from(responseBody));
        response.emit('end');
      },
      destroy: jest.fn(),
    });
    let responseHandler: (value: http.IncomingMessage) => void = () => undefined;
    const requestFunction = (
      _url: URL,
      _options: http.RequestOptions,
      callback: (value: http.IncomingMessage) => void,
    ): http.ClientRequest => {
      responseHandler = callback;
      return request as unknown as http.ClientRequest;
    };

    await expect(sendDataRegistryDelete(requestUrl, 'oc-token', requestFunction)).resolves.toEqual({
      response: {
        status: 202,
        body: { deleted: true },
        headers: { 'content-type': 'application/json' },
      },
    });
  });

  it('should convert a Node request error into a transport error result', async () => {
    const request = Object.assign(new EventEmitter(), {
      end: () => request.emit('error', new Error('socket reset')),
      destroy: jest.fn(),
    });
    const requestFunction = (): http.ClientRequest => request as unknown as http.ClientRequest;

    await expect(sendDataRegistryDelete(requestUrl, 'oc-token', requestFunction)).resolves.toEqual({
      transportError: 'socket reset',
    });
  });
});
