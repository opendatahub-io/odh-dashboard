import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fastify, FastifyInstance } from 'fastify';
import {
  CACHE_CONTROL_NO_STORE,
  CROSS_ORIGIN_OPENER_POLICY,
  REFERRER_POLICY,
  X_CONTENT_TYPE_OPTIONS,
  X_DNS_PREFETCH_CONTROL,
  X_FRAME_OPTIONS,
} from '../utils/securityHeaders';

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
  const SCRIPT_BREAKOUT = '</script><script>window.__xss = true</script>';
  const originalModuleFederationConfig = process.env.MODULE_FEDERATION_CONFIG;

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
    process.env.MODULE_FEDERATION_CONFIG = JSON.stringify([
      {
        name: 'testRemote',
        backend: {
          remoteEntry: SCRIPT_BREAKOUT,
          service: { name: 'test-service', namespace: 'test-namespace', port: 8080 },
        },
      },
    ]);
    // registerRoutes must register the root route *inside* initializeApp's context, as it
    // does in production — `reply.view` is only decorated within that encapsulation.
    jest.doMock('../register-routes', () => ({
      registerPlugins: jest.fn().mockResolvedValue(undefined),
      registerRoutes: jest.fn(async (instance: FastifyInstance) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        await instance.register(require('../routes/root').default);
        instance.get('/api/health', async () => ({ status: 'ok' }));
        instance.get('/api/status', async () => ({ userName: 'test' }));
        // Minimal WebSocket route for 101 header testing (no auth required).
        instance.get('/ws-header-test', { websocket: true }, (socket) => {
          socket.close();
        });
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initializeApp } = require('../app');

    app = fastify();
    await app.register(initializeApp);
    await app.ready();
    // jest.resetModules() re-evaluates the app's module graph on every test; on a cold transform
    // cache with coverage enabled that takes longer than the default 5 s hook timeout.
  }, 30_000);

  afterEach(async () => {
    await app.close();
    delete process.env.ODH_STATIC_DIR;
    if (originalModuleFederationConfig === undefined) {
      delete process.env.MODULE_FEDERATION_CONFIG;
    } else {
      process.env.MODULE_FEDERATION_CONFIG = originalModuleFederationConfig;
    }
  });

  describe('security headers', () => {
    const expectConsoleSecurityHeaders = (headers: Record<string, unknown>): void => {
      expect(headers['x-content-type-options']).toBe(X_CONTENT_TYPE_OPTIONS);
      expect(headers['cross-origin-opener-policy']).toBe(CROSS_ORIGIN_OPENER_POLICY);
      expect(headers['x-frame-options']).toBe(X_FRAME_OPTIONS);
      expect(headers['x-dns-prefetch-control']).toBe(X_DNS_PREFETCH_CONTROL);
      expect(headers['referrer-policy']).toBe(REFERRER_POLICY);
    };

    it('should set Console-equivalent headers and no-store on HTML', async () => {
      const response = await app.inject({ method: 'GET', url: '/projects' });

      expect(response.statusCode).toBe(200);
      expectConsoleSecurityHeaders(response.headers);
      expect(response.headers['cache-control']).toBe(CACHE_CONTROL_NO_STORE);
    });

    it('should keep host static file cache policies', async () => {
      const hashed = await app.inject({ method: 'GET', url: `/${HASHED_ASSET}` });
      const unhashed = await app.inject({ method: 'GET', url: '/vendor.js' });
      const image = await app.inject({ method: 'GET', url: '/logo.png' });

      expectConsoleSecurityHeaders(hashed.headers);
      expect(hashed.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(unhashed.headers['cache-control']).toBe('no-cache');
      expect(image.headers['cache-control']).toBe('public, max-age=86400');
    });

    it('should set no-store on API responses', async () => {
      const health = await app.inject({ method: 'GET', url: '/api/health' });
      const status = await app.inject({ method: 'GET', url: '/api/status' });

      for (const response of [health, status]) {
        expectConsoleSecurityHeaders(response.headers);
        expect(response.headers['cache-control']).toBe(CACHE_CONTROL_NO_STORE);
      }
      expect(health.json()).toEqual({ status: 'ok' });
    });
  });

  describe('WebSocket 101 security headers', () => {
    it('should include nosniff on WebSocket upgrade responses', async () => {
      const address = await app.listen({ port: 0 });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const WebSocket = require('ws') as typeof import('ws');

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${address.replace('http', 'ws')}/ws-header-test`);

        ws.on('upgrade', (response: { headers: Record<string, string> }) => {
          try {
            expect(response.headers['x-content-type-options']).toBe(X_CONTENT_TYPE_OPTIONS);
            resolve();
          } catch (err) {
            reject(err);
          } finally {
            ws.close();
          }
        });

        ws.on('error', (err: Error) => {
          reject(new Error(`WebSocket connection error: ${err.message}`));
        });
      });
    });
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

    it('should 500 every asset with the v6 setHeaders form', async () => {
      const legacy = fastify();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      await legacy.register(require('@fastify/static'), {
        root: publicDir,
        wildcard: false,
        index: false,
        setHeaders: (res: { setHeader: (name: string, value: string) => void }) => {
          res.setHeader('Cache-Control', 'no-cache');
        },
      });
      await legacy.ready();

      const response = await legacy.inject({ method: 'GET', url: `/${HASHED_ASSET}` });

      expect(response.statusCode).toBe(500);

      await legacy.close();
    });

    it('should not auto-serve index.html for the static root', async () => {
      // `index: false` — '/' must fall through to the view route, not the static plugin.
      const response = await app.inject({ method: 'GET', url: '/' });

      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
    });
  });

  describe('@fastify/view EJS rendering', () => {
    it('should render index.html for an SPA deep link', async () => {
      const response = await app.inject({ method: 'GET', url: '/projects' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('mf-remotes-json');
      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
    });

    it('should interpolate the template rather than emit raw EJS tags', async () => {
      const response = await app.inject({ method: 'GET', url: '/projects' });

      expect(response.statusCode).toBe(200);
      expect(response.body).not.toContain('<?');
      expect(response.body).not.toContain('mfRemotesJson');
    });

    it('should render federation configuration without allowing a script breakout', async () => {
      const response = await app.inject({ method: 'GET', url: '/projects' });
      const jsonMatch = response.body.match(
        /<script id="mf-remotes-json" type="application\/json">(.*?)<\/script>/,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.match(/<script/g)).toHaveLength(1);
      expect(response.body).not.toContain(SCRIPT_BREAKOUT);
      expect(jsonMatch).not.toBeNull();
      expect(JSON.parse(jsonMatch?.[1] ?? '')).toEqual([
        { name: 'testRemote', remoteEntry: SCRIPT_BREAKOUT },
      ]);
    });
  });
});
