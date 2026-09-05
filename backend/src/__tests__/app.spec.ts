import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fastify, FastifyInstance } from 'fastify';

/**
 * Guards the SPA-serving wiring in `app.ts` — `@fastify/static` (v6 -> v10) and
 * `@fastify/view` (v9 -> v12). Both are major bumps whose APIs changed, and neither is
 * covered by the Cypress suite: local dev serves assets from the webpack dev server on
 * :4010, so the backend's own static/view path only runs in production.
 *
 * `setHeaders` in particular changed signature — the old `(res) => res.setHeader(...)`
 * form makes every asset request return 500 on v10, which would break the whole app.
 *
 * `register-routes` is mocked so this needs no cluster. The mock still registers the real
 * root route inside `initializeApp`, because `reply.view` is decorated only within that
 * encapsulation — registering it as a sibling would not reproduce production.
 */
describe('app static and view wiring', () => {
  let publicDir: string;
  let app: FastifyInstance;

  const HASHED_ASSET = 'app.db5954bb8ab62ecf.js';

  beforeAll(() => {
    publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'odh-app-spec-'));
    // Mirrors frontend/src/index.html — ejs delimiter is '?' (set in app.ts)
    fs.writeFileSync(
      path.join(publicDir, 'index.html'),
      '<!doctype html><html><head><script id="mf-remotes-json" type="application/json"><?- mfRemotesJson ?></script></head><body>app</body></html>',
    );
    fs.writeFileSync(path.join(publicDir, HASHED_ASSET), 'console.log(1);');
    fs.writeFileSync(path.join(publicDir, 'vendor.js'), 'console.log(2);');
    fs.writeFileSync(path.join(publicDir, 'logo.png'), 'png');
    fs.writeFileSync(path.join(publicDir, 'rhoai-favicon.svg'), '<svg/>');
  });

  afterAll(() => {
    fs.rmSync(publicDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    jest.resetModules();
    // publicDir is resolved when app.ts is first evaluated, so set it before requiring.
    process.env.ODH_STATIC_DIR = publicDir;
    // registerRoutes must register the root route *inside* initializeApp's context, as it
    // does in production — `reply.view` is only decorated within that encapsulation.
    jest.doMock('../register-routes', () => ({
      registerPlugins: jest.fn().mockResolvedValue(undefined),
      registerRoutes: jest.fn(async (instance: FastifyInstance) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        await instance.register(require('../routes/root').default);
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initializeApp } = require('../app');

    app = fastify();
    await app.register(initializeApp);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.ODH_STATIC_DIR;
  });

  describe('@fastify/static cache headers', () => {
    it('should serve a hashed asset as immutable', async () => {
      const response = await app.inject({ method: 'GET', url: `/${HASHED_ASSET}` });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    });

    it('should serve an unhashed script as no-cache', async () => {
      const response = await app.inject({ method: 'GET', url: '/vendor.js' });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('no-cache');
    });

    it.each(['/logo.png', '/rhoai-favicon.svg'])(
      'should serve the unhashed image %s with a short cache',
      async (url) => {
        const response = await app.inject({ method: 'GET', url });

        expect(response.statusCode).toBe(200);
        expect(response.headers['cache-control']).toBe('public, max-age=86400');
      },
    );

    it('should not 500 while applying setHeaders', async () => {
      // The v6 `(res) => res.setHeader(...)` form throws on v10 and 500s every asset.
      const response = await app.inject({ method: 'GET', url: `/${HASHED_ASSET}` });

      expect(response.statusCode).not.toBe(500);
    });

    it('should not auto-serve index.html for the static root', async () => {
      // `index: false` — '/' must fall through to the view route, not the static plugin.
      const response = await app.inject({ method: 'GET', url: '/' });

      expect(response.headers['cache-control']).toBe('no-cache');
    });
  });

  describe('@fastify/view EJS rendering', () => {
    it('should render index.html for an SPA deep link', async () => {
      const response = await app.inject({ method: 'GET', url: '/projects' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('mf-remotes-json');
      expect(response.headers['cache-control']).toBe('no-cache');
    });

    it('should interpolate the template rather than emit raw EJS tags', async () => {
      const response = await app.inject({ method: 'GET', url: '/projects' });

      expect(response.statusCode).toBe(200);
      expect(response.body).not.toContain('<?');
      expect(response.body).not.toContain('mfRemotesJson');
    });
  });
});
