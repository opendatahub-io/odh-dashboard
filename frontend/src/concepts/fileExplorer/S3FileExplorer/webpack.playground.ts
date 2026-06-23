/**
 * S3FileExplorer/webpack.playground.ts
 * To allow easier manual testing and debugging of the S3FileExplorer component,
 * this minimal webpack configuration allows a lightweight playground (ie: storybook-like) UI to render.
 * The component can be rendered by itself without having to run all of odh-dashboard &
 * any top-level feature that makes use of S3FileExplorer.
 *
 * Running this playground is done through webpack as a serve command:
 * ```
 * TS_NODE_PROJECT=./frontend/src/concepts/fileExplorer/S3FileExplorer/tsconfig.playground.json webpack serve --config ./frontend/src/concepts/fileExplorer/S3FileExplorer/webpack.playground.ts
 * ```
 */

/* eslint-disable no-console */

// Modules -------------------------------------------------------------------->

import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import webpack from 'webpack'; // eslint-disable-line import/no-named-as-default
import type { Configuration } from 'webpack';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';

// Globals -------------------------------------------------------------------->

const currentDir = __dirname;

const PROJECT_ROOT = path.resolve(currentDir, '../../../../');
const ODH_ROOT = path.resolve(PROJECT_ROOT, '../');

const getProxyHeaders = () => {
  try {
    const token = execSync('oc whoami -t').toString().trim();
    const username = execSync('oc whoami').toString().trim();
    console.info('Logged in as user:', username);
    return {
      Authorization: `Bearer ${token}`,
      'x-forwarded-access-token': token,
    };
  } catch (error: unknown) {
    throw new Error(
      `Failed to get Kubernetes token. Ensure you are logged in with \`oc login\`. Cause: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
};

const ENV_TO_INCLUDE = [
  /**
   * `S3FILEEXPLORER_PLAYGROUND_S3_NAMESPACE`: The openshift namespace the playground should make calls against.
   */
  'S3FILEEXPLORER_PLAYGROUND_S3_NAMESPACE',

  /**
   * `S3FILEEXPLORER_PLAYGROUND_S3_SECRET_NAME`: The odh secret name that should be used when fetching S3 Files (secret should be a valid S3-compatible connection secret).
   */
  'S3FILEEXPLORER_PLAYGROUND_S3_SECRET_NAME',

  /**
   * `S3FILEEXPLORER_PLAYGROUND_S3_SECRET_NAME_NO_BUCKET`: The odh secret name that should be used when rendering the error state for an S3-compatible connection secret with no provided bucket.
   */
  'S3FILEEXPLORER_PLAYGROUND_S3_SECRET_NAME_NO_BUCKET',

  /**
   * `S3FILEEXPLORER_PLAYGROUND_S3_SECRET_NAME_HTTP`: The odh secret name that should be used when rendering the error state for an S3-compatible connection secret with http as the url scheme.
   */
  'S3FILEEXPLORER_PLAYGROUND_S3_SECRET_NAME_HTTP',
];
const ENV_STUB_FALSE = [
  'APP_ENV',
  'BACKEND_PORT',
  'COMMUNITY_LINK',
  'COMPANY_URI',
  'CONSOLE_LINK_DOMAIN',
  'DASHBOARD_CONFIG',
  'DEPLOYMENT_MODE',
  'DOC_LINK',
  'EXT_CLUSTER',
  'FAST_POLL_INTERVAL',
  'IMAGE_DIR',
  'INTERNAL_DASHBOARD_VERSION',
  'KUBEFLOW_USERNAME',
  'LOGO',
  'MANDATORY_NAMESPACE',
  'MF_REMOTES',
  'ODH_LOGO',
  'ODH_LOGO_DARK',
  'ODH_NOTEBOOK_REPO',
  'ODH_PRODUCT_NAME',
  'POLL_INTERVAL',
  'SERVER_TIMEOUT',
  'STYLE_THEME',
  'SUPPORT_LINK',
  'WS_HOSTNAME',
];

dotenv.config({ path: path.resolve(ODH_ROOT, '.env.local') });

const playgroundEnv: Record<string, string> = {};
ENV_TO_INCLUDE.forEach((key) => {
  playgroundEnv[`process.env.${key}`] = JSON.stringify(process.env[key] ?? '');
});
ENV_STUB_FALSE.forEach((key) => {
  playgroundEnv[`process.env.${key}`] = 'false';
});
const NODE_MODULES = path.resolve(ODH_ROOT, 'node_modules');

// Config --------------------------------------------------------------------->

const config: Configuration & { devServer?: DevServerConfiguration } = {
  mode: 'development',
  entry: path.resolve(currentDir, 'S3FileExplorer.playground.tsx'),
  devtool: 'eval-source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '#~': path.resolve(PROJECT_ROOT, 'src'),
      '~': path.resolve(PROJECT_ROOT, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx|js)$/,
        exclude: /node_modules/,
        use: { loader: 'swc-loader' },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(svg|ttf|eot|woff|woff2)$/,
        include: [
          path.resolve(NODE_MODULES, '@patternfly'),
          path.resolve(NODE_MODULES, 'patternfly'),
        ],
        use: {
          loader: 'file-loader',
          options: { outputPath: 'fonts', name: '[name].[ext]' },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin(playgroundEnv),
    new HtmlWebpackPlugin({ title: 'S3FileExplorer Playground' }),
    new ReactRefreshWebpackPlugin(),
  ],
  devServer: {
    port: 6006,
    hot: true,
    open: false,
    proxy: [
      {
        context: ['/api', '/autorag/api'],
        target: {
          host: 'localhost',
          protocol: 'http',
          port: 4001,
        },
        changeOrigin: true,
        pathRewrite: { '^/autorag': '' },
        headers: getProxyHeaders(),
      },
    ],
  },
};

// Public --------------------------------------------------------------------->

export default config;
