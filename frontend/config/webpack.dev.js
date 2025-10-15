/* eslint-disable @typescript-eslint/restrict-template-expressions */
const { execSync } = require('child_process');
const path = require('path');
const { merge } = require('webpack-merge');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

const smp = new SpeedMeasurePlugin({ disable: !process.env.MEASURE });

setupDotenvFilesForEnv({ env: 'development' });
const webpackCommon = require('./webpack.common.js');
const { moduleFederationConfig } = require('./moduleFederation');

const RELATIVE_DIRNAME = process.env._ODH_RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._ODH_IS_PROJECT_ROOT_DIR;
const SRC_DIR = process.env._ODH_SRC_DIR;
const COMMON_DIR = process.env._ODH_COMMON_DIR;
const DIST_DIR = process.env._ODH_DIST_DIR;
const HOST = process.env._ODH_HOST;
const PORT = process.env._ODH_PORT;
const BACKEND_PORT = process.env._BACKEND_PORT;

const mfProxies = moduleFederationConfig.map((config) => config.proxy.map((p) => p.path)).flat();

module.exports = smp.wrap(
  merge(
    {
      plugins: [
        ...setupWebpackDotenvFilesForEnv({
          directory: RELATIVE_DIRNAME,
          env: 'development',
          isRoot: IS_PROJECT_ROOT_DIR,
        }),
      ],
    },
    webpackCommon('development'),
    {
      mode: 'development',
      devtool: 'eval-source-map',
      optimization: {
        runtimeChunk: 'single',
        removeEmptyChunks: true,
      },
      watchOptions: {
        ignored: [
          '**/node_modules',
          '**/dist',
          '**/public',
          '**/public-cypress',
          '**/coverage',
          '**/jest-coverage',
          '**/.nyc_output',
          '**/upstream',
          '**/__tests__',
        ],
      },
      devServer: {
        host: HOST,
        port: PORT,
        compress: true,
        historyApiFallback: true,
        hot: true,
        open: false,
        proxy: (() => {
          if (process.env.EXT_CLUSTER) {
            const odhProject = process.env.OC_PROJECT || 'opendatahub';
            const app = process.env.ODH_APP || 'odh-dashboard';
            console.info('Using project:', odhProject);

            let dashboardHost;
            let token;
            try {
              try {
                dashboardHost = execSync(
                  `oc get routes -n ${odhProject} ${app} -o jsonpath='{.spec.host}'`,
                )
                  .toString()
                  .trim();
              } catch (e) {
                console.info('Failed to GET dashboard route, constructing host manually.');
                dashboardHost = new URL(
                  execSync(`oc whoami --show-console`).toString(),
                ).host.replace(/^[^.]+\./, `${app}-${odhProject}.`);
              }
              console.info('Dashboard host:', dashboardHost);

              token = execSync('oc whoami --show-token').toString().trim();

              const username = execSync('oc whoami').toString().trim();
              console.info('Logged in as user:', username);
            } catch (e) {
              console.error('Login with `oc login` prior to starting dev server.');
              process.exit(1);
            }

            const headers = {
              Authorization: `Bearer ${token}`,
              'x-forwarded-access-token': token,
            };

            return [
              {
                context: ['/api', '/_mf', ...mfProxies],
                target: `https://${dashboardHost}`,
                secure: false,
                changeOrigin: true,
                headers,
              },
              {
                context: ['/wss'],
                target: `wss://${dashboardHost}`,
                ws: true,
                secure: false,
                changeOrigin: true,
                headers,
              },
            ];
          }
          return [
            {
              context: ['/api', '/_mf', ...mfProxies],
              target: `http://0.0.0.0:${BACKEND_PORT}`,
            },
            {
              context: ['/wss'],
              target: `ws://0.0.0.0:${BACKEND_PORT}`,
              ws: true,
            },
          ];
        })(),
        devMiddleware: {
          stats: 'errors-only',
        },
        client: {
          overlay: false,
          // Explicit websocket configuration for dynamic ports
          webSocketURL: {
            hostname: 'localhost',
            port: PORT,
            protocol: 'ws',
            pathname: '/ws',
          },
          // Enable verbose logging from webpack-dev-server client
          logging: process.env.CI ? 'verbose' : 'info',
        },
        static: {
          directory: DIST_DIR,
        },
        setupMiddlewares: (middlewares, devServer) => {
          // Add debugging middleware to track websocket connections
          console.log('\n🔧 [WEBPACK] setupMiddlewares called');
          console.log(`🔧 [WEBPACK] Server will listen on: http://${HOST}:${PORT}`);
          console.log(`🔧 [WEBPACK] WebSocket URL: ws://localhost:${PORT}/ws`);
          
          // Log all incoming requests
          devServer.app.use((req, res, next) => {
            if (process.env.CI) {
              const timestamp = new Date().toISOString();
              console.log(`[${timestamp}] ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers.upgrade || 'none')}`);
            }
            next();
          });

          // Track websocket upgrades
          devServer.server.on('upgrade', (request, socket, head) => {
            console.log(`\n🔌 [WEBPACK] WebSocket upgrade request received:`);
            console.log(`   URL: ${request.url}`);
            console.log(`   Origin: ${request.headers.origin || 'none'}`);
            console.log(`   Connection: ${request.headers.connection}`);
            console.log(`   Upgrade: ${request.headers.upgrade}`);
          });

          // Track websocket connections
          const wss = devServer.webSocketServer;
          if (wss) {
            const originalOn = wss.on.bind(wss);
            wss.on = function(event, handler) {
              if (event === 'connection') {
                return originalOn(event, function(ws, req) {
                  console.log(`✅ [WEBPACK] WebSocket client connected from: ${req.socket.remoteAddress}`);
                  
                  ws.on('close', (code, reason) => {
                    console.log(`❌ [WEBPACK] WebSocket client disconnected - Code: ${code}, Reason: ${reason || 'none'}`);
                  });
                  
                  ws.on('error', (error) => {
                    console.error(`⚠️  [WEBPACK] WebSocket error:`, error.message);
                  });
                  
                  return handler.call(this, ws, req);
                });
              }
              return originalOn(event, handler);
            };
          }

          return middlewares;
        },
        onListening: (devServer) => {
          if (devServer) {
            const actualPort = devServer.server.address().port;
            console.log(
              `\x1b[32m✓ ODH Dashboard available at: \x1b[4mhttp://localhost:${actualPort}\x1b[0m`,
            );
            console.log(`🔌 WebSocket endpoint: ws://localhost:${actualPort}/ws`);
            console.log(`🔌 Expected client connection to: ws://localhost:${PORT}/ws`);
            if (PORT != actualPort) {
              console.error(`\x1b[31m⚠️  PORT MISMATCH! Config: ${PORT}, Actual: ${actualPort}\x1b[0m`);
            }
            console.log(`📊 File descriptor limit: ${require('child_process').execSync('ulimit -n').toString().trim()}`);
          }
        },
      },
      module: {
        rules: [
          {
            test: /\.css$/,
            include: [
              SRC_DIR,
              COMMON_DIR,
              path.resolve(RELATIVE_DIRNAME, '../node_modules/@patternfly'),
              path.resolve(RELATIVE_DIRNAME, '../node_modules/monaco-editor'),
            ],
            use: ['style-loader', 'css-loader'],
          },
        ],
      },
      plugins: [
        new ForkTsCheckerWebpackPlugin(),
        new ReactRefreshWebpackPlugin({ overlay: false }),
      ],
    },
  ),
);
