const path = require('path');
const { merge } = require('rspack-merge');
const { TsCheckerRspackPlugin } = require('ts-checker-rspack-plugin');
const rspackCommon = require('./rspack.common.js');

const RELATIVE_DIRNAME = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(RELATIVE_DIRNAME, 'public');
const PORT = process.env.SHELL_PORT || 4010;
const BFF_PORT = process.env.BFF_PORT || 4000;

module.exports = merge(rspackCommon(), {
  mode: 'development',
  devtool: 'eval-source-map',
  optimization: {
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
  plugins: [new TsCheckerRspackPlugin()],
});
