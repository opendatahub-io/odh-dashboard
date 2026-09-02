import { fastify } from 'fastify';
import fastifyAccepts from '@fastify/accepts';
import { PassThroughData } from '../utils/pass-through';
import k8sRoute from '../routes/api/k8s/index';
import { registerPatchContentTypeParsers } from '../utils/patchContentTypeParsers';

jest.mock('../utils/fileUtils', () => ({
  logRequestDetails: jest.fn(),
}));

const captured: { data?: PassThroughData } = {};

jest.mock('../utils/pass-through', () => ({
  passThroughResource: jest.fn((_fastify, _req, data: PassThroughData) => {
    captured.data = data;
    return Promise.resolve({ kind: 'Pod', metadata: { name: 'test' } });
  }),
  passThroughText: jest.fn((_fastify, _req, data: PassThroughData) => {
    captured.data = data;
    return Promise.resolve('ok');
  }),
}));

describe('k8s pass-through inject', () => {
  const buildApp = async () => {
    captured.data = undefined;
    const app = fastify();
    registerPatchContentTypeParsers(app);
    await app.register(fastifyAccepts);
    app.decorate('kube', {
      config: {
        getCurrentCluster: () => ({ server: 'https://k8s.test' }),
      },
    });
    await app.register(k8sRoute, { prefix: '/api/k8s' });
    await app.ready();
    return app;
  };

  it('should not forward a body on GET with no payload', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/k8s/api/v1/namespaces/test/pods',
      headers: {
        accept: 'application/json',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured.data?.requestData).toBeUndefined();
    expect(captured.data?.method).toBe('GET');

    await app.close();
  });

  it('should accept json-patch PATCH and forward the body', async () => {
    const app = await buildApp();
    const payload = [{ op: 'add', path: '/metadata/annotations/stopped', value: 'true' }];

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/k8s/apis/kubeflow.org/v1/namespaces/test/notebooks/nb',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json-patch+json',
      },
      payload: JSON.stringify(payload),
    });

    expect(response.statusCode).toBe(200);
    expect(captured.data?.requestData).toBe(JSON.stringify(payload));
    expect(captured.data?.overrideContentType).toContain('json-patch+json');

    await app.close();
  });

  it('should accept DELETE with no content type', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/k8s/api/v1/namespaces/test/pods/p',
      headers: {
        accept: 'application/json',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured.data?.requestData).toBeUndefined();

    await app.close();
  });

  it('should accept DELETE with application/json and {}', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/k8s/api/v1/namespaces/test/pods/p',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      payload: '{}',
    });

    expect(response.statusCode).toBe(200);
    expect(captured.data?.requestData).toBe('{}');

    await app.close();
  });

  it('should accept DELETE with application/json and an empty body', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/k8s/api/v1/namespaces/test/pods/p',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'content-length': '0',
      },
      payload: '',
    });

    expect(response.statusCode).not.toBe(400);
    expect(response.statusCode).toBe(200);

    await app.close();
  });

  it('should use the json pass-through when Accept is application/json', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/k8s/api/v1/pods',
      headers: {
        accept: 'application/json',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ kind: 'Pod', metadata: { name: 'test' } });

    await app.close();
  });
});
