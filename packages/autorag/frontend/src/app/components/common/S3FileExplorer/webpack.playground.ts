/* eslint-disable no-console */

import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import webpack from 'webpack'; // eslint-disable-line import/no-named-as-default
import type { Configuration } from 'webpack';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const PROJECT_ROOT = path.resolve(currentDir, '../../../../../');
const ODH_ROOT = path.resolve(PROJECT_ROOT, '../../../');

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
    throw new Error('Failed to get Kubernetes token. Ensure you are logged in with `oc login`.', {
      cause: error,
    });
  }
};

const ENV_TO_INCLUDE = [
  /**
   * `AUTORAG_PLAYGROUND_S3_NAMESPACE`: The openshift namespace the playground should make calls against.
   */
  'AUTORAG_PLAYGROUND_S3_NAMESPACE',

  /**
   * `AUTORAG_PLAYGROUND_S3_SECRET_NAME`: The odh secret name that should be used when fetching S3 Files (secret should be a valid S3-compatible connection secret).
   */
  'AUTORAG_PLAYGROUND_S3_SECRET_NAME',

  /**
   * `AUTORAG_PLAYGROUND_S3_SECRET_NAME_NO_BUCKET`: The odh secret name that should be used when rendering the error state for an S3-compatible connection secret with no provided bucket.
   */
  'AUTORAG_PLAYGROUND_S3_SECRET_NAME_NO_BUCKET',

  /**
   * `AUTORAG_PLAYGROUND_S3_SECRET_NAME_HTTP`: The odh secret name that should be used when rendering the error state for an S3-compatible connection secret with http as the url scheme.
   */
  'AUTORAG_PLAYGROUND_S3_SECRET_NAME_HTTP',
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
const NODE_MODULES = path.resolve(PROJECT_ROOT, 'node_modules');

const config: Configuration & { devServer?: DevServerConfiguration } = {
  mode: 'development',
  entry: path.resolve(currentDir, 'S3FileExplorer.playground.tsx'),
  devtool: 'eval-source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
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

export default config;
