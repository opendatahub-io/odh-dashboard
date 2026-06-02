const path = require('path');
const { merge } = require('webpack-merge');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const webpackCommon = require('./webpack.common.js');

const RELATIVE_DIRNAME = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(RELATIVE_DIRNAME, 'public');
const PORT = process.env.SHELL_PORT || 4010;
const BFF_PORT = process.env.BFF_PORT || 4000;

module.exports = merge(webpackCommon('development'), {
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
    ],
    client: {
      overlay: false,
    },
    static: {
      directory: DIST_DIR,
    },
    onListening: (devServer) => {
      const addr = devServer?.server?.address();
      if (addr) {
        console.log(
          `\x1b[32m✓ App Shell available at: \x1b[4mhttp://localhost:${addr.port}\x1b[0m`,
        );
      }
    },
  },
  plugins: [new ForkTsCheckerWebpackPlugin()],
});
