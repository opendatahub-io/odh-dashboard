/**
 * FileExplorer/webpack.playground.ts
 * To allow easier manual testing and debugging of the FileExplorer component,
 * this minimal webpack configuration allows a lightweight playground (ie: storybook-like) UI to render.
 * The component can be rendered by itself without having to run all of odh-dashboard &
 * any top-level feature that makes use of FileExplorer.
 *
 * Running this playground is done through webpack as a serve command.
 * ```
 * TS_NODE_PROJECT=./frontend/src/concepts/fileExplorer/FileExplorer/tsconfig.playground.json webpack serve --config ./frontend/src/concepts/fileExplorer/FileExplorer/webpack.playground.ts
 * ```
 */

// Modules -------------------------------------------------------------------->

import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import type { Configuration } from 'webpack';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';

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
    new HtmlWebpackPlugin({ title: 'FileExplorer Playground' }),
    new ReactRefreshWebpackPlugin(),
  ],
  devServer: {
    port: 6005,
    hot: true,
    open: false,
  },
};

// Public --------------------------------------------------------------------->

export default config;
