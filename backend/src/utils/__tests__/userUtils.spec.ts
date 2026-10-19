import * as http from 'http';
import { AddressInfo } from 'net';
import { FastifyRequest } from 'fastify';
import { CustomObjectsApi, KubeConfig } from '@kubernetes/client-node';
import { KubeFastifyInstance } from '../../types';
import { createK8sApiClient } from '../k8sClient';
import { getUser, getUserInfo, getUsernameFromSelfSubjectReview } from '../userUtils';

/**
 * Identity calls run against a local API server so the test can assert exactly which bearer
 * token reaches the server for each call.
 */

const KUBECONFIG_TOKEN = 'kubeconfig-token';
const USER_TOKEN = 'requesting-user-token';

type Behaviour = {
  usersApi: 'ok' | 'notFound' | 'forbidden';
  selfSubjectReview: 'ok' | 'forbidden';
};

type Recorded = { method: string; url: string; authorization?: string; body: string };

const status = (code: number, reason: string, message: string) =>
  JSON.stringify({ kind: 'Status', apiVersion: 'v1', status: 'Failure', message, reason, code });

describe('userUtils identity calls', () => {
  let server: http.Server;
  let serverUrl: string;
  const requests: Recorded[] = [];
  const behaviour: Behaviour = { usersApi: 'ok', selfSubjectReview: 'ok' };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        requests.push({
          method: req.method ?? '',
          url: req.url ?? '',
          authorization: req.headers.authorization,
          body,
        });
        const send = (code: number, payload: string) => {
          res.writeHead(code, { 'content-type': 'application/json' });
          res.end(payload);
        };
        if (req.url === '/apis/user.openshift.io/v1/users/~') {
          if (behaviour.usersApi === 'notFound') {
            send(404, status(404, 'NotFound', 'the server could not find the requested resource'));
          } else if (behaviour.usersApi === 'forbidden') {
            send(403, status(403, 'Forbidden', 'users.user.openshift.io "~" is forbidden'));
          } else {
            send(
              200,
              JSON.stringify({
                kind: 'User',
                apiVersion: 'user.openshift.io/v1',
                metadata: { name: 'oauth-user', uid: 'u1', resourceVersion: '1' },
                identities: [],
                groups: [],
              }),
            );
          }
          return;
        }
        if (req.url === '/apis/authentication.k8s.io/v1/selfsubjectreviews') {
          if (behaviour.selfSubjectReview === 'forbidden') {
            send(403, status(403, 'Forbidden', 'forbidden'));
          } else {
            send(
              201,
              JSON.stringify({
                apiVersion: 'authentication.k8s.io/v1',
                kind: 'SelfSubjectReview',
                status: { userInfo: { username: 'ssr-user' } },
              }),
            );
          }
          return;
        }
        send(404, status(404, 'NotFound', 'not found'));
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const { port } = server.address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    requests.length = 0;
    behaviour.usersApi = 'ok';
    behaviour.selfSubjectReview = 'ok';
  });

  const makeFastify = (): KubeFastifyInstance => {
    const kc = new KubeConfig();
    kc.loadFromOptions({
      clusters: [{ name: 'cluster', server: serverUrl, skipTLSVerify: true }],
      users: [{ name: 'kubeconfig-user', token: KUBECONFIG_TOKEN }],
      contexts: [{ name: 'context', cluster: 'cluster', user: 'kubeconfig-user' }],
      currentContext: 'context',
    });
    return {
      kube: {
        config: kc,
        customObjectsApi: createK8sApiClient(kc, CustomObjectsApi),
        currentUser: kc.getCurrentUser(),
      },
      log: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
    } as unknown as KubeFastifyInstance;
  };

  const makeRequest = (headers: Record<string, string>): FastifyRequest =>
    ({ headers } as unknown as FastifyRequest);

  const authorizations = () => requests.map((r) => r.authorization);

  describe('getUser', () => {
    it('should send only the requesting user token', async () => {
      const user = await getUser(
        makeFastify(),
        makeRequest({ 'x-forwarded-access-token': USER_TOKEN }),
      );

      expect(user.metadata.name).toBe('oauth-user');
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('GET');
      expect(authorizations()).toEqual([`Bearer ${USER_TOKEN}`]);
    });

    it('should reject with the Kubernetes status code and message on failure', async () => {
      behaviour.usersApi = 'forbidden';

      await expect(
        getUser(makeFastify(), makeRequest({ 'x-forwarded-access-token': USER_TOKEN })),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Error getting Oauth Info for user, users.user.openshift.io "~" is forbidden',
      });
      expect(authorizations()).toEqual([`Bearer ${USER_TOKEN}`]);
    });

    it('should reject with 401 without calling the API server when no token is forwarded', async () => {
      await expect(getUser(makeFastify(), makeRequest({}))).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(requests).toHaveLength(0);
    });
  });

  describe('getUsernameFromSelfSubjectReview', () => {
    it('should send only the requesting user token', async () => {
      const username = await getUsernameFromSelfSubjectReview(makeFastify(), USER_TOKEN);

      expect(username).toBe('ssr-user');
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('POST');
      expect(JSON.parse(requests[0].body)).toEqual({
        apiVersion: 'authentication.k8s.io/v1',
        kind: 'SelfSubjectReview',
        metadata: {},
      });
      expect(authorizations()).toEqual([`Bearer ${USER_TOKEN}`]);
    });

    it('should return null when the review is rejected', async () => {
      behaviour.selfSubjectReview = 'forbidden';

      await expect(getUsernameFromSelfSubjectReview(makeFastify(), USER_TOKEN)).resolves.toBeNull();
      expect(authorizations()).toEqual([`Bearer ${USER_TOKEN}`]);
    });
  });

  describe('getUserInfo', () => {
    it('should prefer the kube-rbac-proxy header without calling the API server', async () => {
      const info = await getUserInfo(
        makeFastify(),
        makeRequest({ 'x-auth-request-user': 'rbac-user', 'x-forwarded-access-token': USER_TOKEN }),
      );

      expect(info).toEqual({ userName: 'rbac-user', userID: undefined });
      expect(requests).toHaveLength(0);
    });

    it('should use the User API when available', async () => {
      const info = await getUserInfo(
        makeFastify(),
        makeRequest({ 'x-forwarded-access-token': USER_TOKEN }),
      );

      expect(info).toEqual({ userName: 'oauth-user', userID: undefined });
      expect(authorizations()).toEqual([`Bearer ${USER_TOKEN}`]);
    });

    it('should fall back to SelfSubjectReview with the user token when the User API fails', async () => {
      behaviour.usersApi = 'notFound';

      const info = await getUserInfo(
        makeFastify(),
        makeRequest({ 'x-forwarded-access-token': USER_TOKEN }),
      );

      expect(info).toEqual({ userName: 'ssr-user', userID: undefined });
      expect(requests.map((r) => r.url)).toEqual([
        '/apis/user.openshift.io/v1/users/~',
        '/apis/authentication.k8s.io/v1/selfsubjectreviews',
      ]);
      expect(authorizations()).toEqual([`Bearer ${USER_TOKEN}`, `Bearer ${USER_TOKEN}`]);
    });

    it('should fall back to the token claims when both identity APIs fail', async () => {
      behaviour.usersApi = 'notFound';
      behaviour.selfSubjectReview = 'forbidden';
      // base64url of {"preferred_username":"jwt-user"}
      const jwt = 'header.eyJwcmVmZXJyZWRfdXNlcm5hbWUiOiJqd3QtdXNlciJ9.signature';

      const info = await getUserInfo(
        makeFastify(),
        makeRequest({ 'x-forwarded-access-token': jwt }),
      );

      expect(info).toEqual({ userName: 'jwt-user', userID: undefined });
      expect(authorizations()).toEqual([`Bearer ${jwt}`, `Bearer ${jwt}`]);
    });
  });
});
