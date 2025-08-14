/* eslint-disable @typescript-eslint/no-var-requires */

const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || '9000';
const PROXY_HOST = process.env.PROXY_HOST || 'localhost';
const PROXY_PROTOCOL = process.env.PROXY_PROTOCOL || 'http';
const PROXY_PORT = process.env.PROXY_PORT || '8080';

module.exports = merge(common('development'), {
  mode: 'development',
  devtool: 'eval-source-map',
  optimization: {
    runtimeChunk: 'single',
    removeEmptyChunks: true,
  },
  devServer: {
    host: HOST,
    port: PORT,
    hot: true,
    compress: true,
    open: false,
    historyApiFallback: true,
    static: {
      directory: path.resolve(__dirname, 'dist'),
    },

    client: {
      overlay: true,
    },
    proxy: [
      {
        context: ['/api', '/llama-stack/api'],
        target: {
          host: PROXY_HOST,
          port: PROXY_PORT,
          protocol: PROXY_PROTOCOL,
        },
        changeOrigin: true,
      },
    ],
  },
  plugins: [new ReactRefreshWebpackPlugin({ overlay: false })],
});
