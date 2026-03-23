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
    console.info('Token value:', token);
    return {
      Authorization: `Bearer ${token}`,
      'x-forwarded-access-token': token,
    };
  } catch (error: unknown) {
    console.error(
      'Failed to get Kubernetes token:',
      error instanceof Error ? error.message : error,
    );
    return {};
  }
};

const ENV_PREFIX = 'AUTORAG_PLAYGROUND_S3';
const ENV_OTHER = [
  'STYLE_THEME',
  'DEPLOYMENT_MODE',
  'APP_ENV',
  'POLL_INTERVAL',
  'POLL_INTERVAL',
  'KUBEFLOW_USERNAME',
  'IMAGE_DIR',
  'LOGO',
  'MANDATORY_NAMESPACE',
  'COMPANY_URI',
];

dotenv.config({ path: path.resolve(ODH_ROOT, '.env.local') });

const playgroundEnv = Object.fromEntries(
  Object.entries(process.env)
    .filter(([k]) => k.startsWith(ENV_PREFIX))
    .map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)]),
);
ENV_OTHER.forEach((o) => {
  playgroundEnv[`process.env.${o}`] = 'false';
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
        // @ts-expect-error TS2322 - proxy headers type mismatch
        headers: getProxyHeaders(),
      },
    ],
  },
};

export default config;
