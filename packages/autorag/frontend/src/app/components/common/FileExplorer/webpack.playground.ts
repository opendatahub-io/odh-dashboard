import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import type { Configuration } from 'webpack';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const PROJECT_ROOT = path.resolve(currentDir, '../../../../../');
const NODE_MODULES = path.resolve(PROJECT_ROOT, 'node_modules');

const config: Configuration & { devServer?: DevServerConfiguration } = {
  mode: 'development',
  entry: path.resolve(currentDir, 'FileExplorer.playground.tsx'),
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
    new HtmlWebpackPlugin({ title: 'FileExplorer Playground' }),
    new ReactRefreshWebpackPlugin(),
  ],
  devServer: {
    port: 6005,
    hot: true,
    open: false,
  },
};

export default config;
