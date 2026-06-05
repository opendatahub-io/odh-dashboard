const path = require('path');
const { merge } = require('webpack-merge');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const webpackCommon = require('./webpack.common.js');

const RELATIVE_DIRNAME = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(RELATIVE_DIRNAME, 'public');
const PORT = process.env.SHELL_PORT || 4020;
const BFF_PORT = process.env.BFF_PORT || 4000;

module.exports = merge(webpackCommon(), {
  mode: 'development',
  devtool: 'eval-source-map',
  optimization: {
    runtimeChunk: 'single',
    removeEmptyChunks: true,
  },
  devServer: {
    host: 'localhost',
    port: PORT,
    compress: true,
    historyApiFallback: true,
    hot: true,
    proxy: [
      {
        context: ['/api'],
        target: `http://localhost:${BFF_PORT}`,
      },
      {
        context: ['/wss'],
        target: `ws://localhost:${BFF_PORT}`,
        ws: true,
      },
    ],
    client: {
      overlay: true,
    },
    static: {
      directory: DIST_DIR,
    },
    onListening: (devServer) => {
      const addr = devServer?.server?.address();
      if (addr) {
        const green = '\x1b[32m';
        const underline = '\x1b[4m';
        const reset = '\x1b[0m';
        const url = `http://localhost:${addr.port}`;
        console.log(`${green}✓ RHAII distribution available at: ${underline}${url}${reset}`);
      } else {
        console.warn('RHAII dev server started but could not determine address');
      }
    },
  },
  plugins: [new ForkTsCheckerWebpackPlugin()],
});
