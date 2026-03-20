import path from 'path';
import { fileURLToPath } from 'url';
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

const ENV_PREFIX = 'AUTORAG_PLAYGROUND_S3';

dotenv.config({ path: path.resolve(ODH_ROOT, '.env.local') });

const playgroundEnv = Object.fromEntries(
  Object.entries(process.env)
    .filter(([k]) => k.startsWith(ENV_PREFIX))
    .map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)]),
);
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
  },
};

export default config;
