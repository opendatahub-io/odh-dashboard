/**
 * FileExplorer/rspack.playground.ts
 * To allow easier manual testing and debugging of the FileExplorer component,
 * this minimal rspack configuration allows a lightweight playground (ie: storybook-like) UI to render.
 * The component can be rendered by itself without having to run all of odh-dashboard &
 * any top-level feature that makes use of FileExplorer.
 *
 * Running this playground is done through rspack as a serve command.
 * ```
 * rspack dev --config ./frontend/src/concepts/fileExplorer/FileExplorer/rspack.playground.ts
 * ```
 */

// Modules -------------------------------------------------------------------->

import path from 'path';
import { rspack } from '@rspack/core';
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';
import type { Configuration } from '@rspack/core';
import type { Configuration as DevServerConfiguration } from '@rspack/dev-server';

// Globals -------------------------------------------------------------------->

const currentDir = __dirname;

const PROJECT_ROOT = path.resolve(currentDir, '../../../../');
const NODE_MODULES = path.resolve(PROJECT_ROOT, '../node_modules');

// Config --------------------------------------------------------------------->

const config: Configuration & { devServer?: DevServerConfiguration } = {
  mode: 'development',
  entry: path.resolve(currentDir, 'FileExplorer.playground.tsx'),
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
        use: {
          loader: 'builtin:swc-loader',
          options: {
            detectSyntax: 'auto',
            jsc: {
              transform: {
                react: {
                  runtime: 'classic',
                  refresh: true,
                },
              },
            },
          },
        },
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
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]',
        },
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ title: 'FileExplorer Playground' }),
    new ReactRefreshRspackPlugin(),
  ],
  devServer: {
    port: 6005,
    hot: true,
    open: false,
  },
};

// Public --------------------------------------------------------------------->

export default config;
