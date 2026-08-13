import { fastify } from 'fastify';
import { registerPatchContentTypeParsers } from '../utils/patchContentTypeParsers';

describe('registerPatchContentTypeParsers', () => {
  const patchPayload = [{ op: 'add', path: '/metadata/annotations/test', value: 'enabled' }];

  it.each(['application/json-patch+json', 'application/merge-patch+json'])(
    'should parse PATCH requests with %s',
    async (contentType) => {
      const app = fastify();
      registerPatchContentTypeParsers(app);

      app.patch('/test', async (request) => request.body);

      const response = await app.inject({
        method: 'PATCH',
        url: '/test',
        headers: {
          'content-type': contentType,
        },
        payload: JSON.stringify(patchPayload),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(patchPayload);

      await app.close();
    },
  );

  it.each(['application/json-patch+json', 'application/merge-patch+json'])(
    'should parse PATCH requests with %s and charset',
    async (contentType) => {
      const app = fastify();
      registerPatchContentTypeParsers(app);

      app.patch('/test', async (request) => request.body);

      const response = await app.inject({
        method: 'PATCH',
        url: '/test',
        headers: {
          'content-type': `${contentType};charset=UTF-8`,
        },
        payload: JSON.stringify(patchPayload),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(patchPayload);

      await app.close();
    },
  );

  it('should reject unsupported PATCH content types with 415', async () => {
    const app = fastify();
    registerPatchContentTypeParsers(app);

    app.patch('/test', async (request) => request.body);

    const response = await app.inject({
      method: 'PATCH',
      url: '/test',
      headers: {
        'content-type': 'application/vnd.example+json',
      },
      payload: JSON.stringify(patchPayload),
    });

    expect(response.statusCode).toBe(415);

    await app.close();
  });
});
