import path from 'path';
import * as TsconfigPathsWebpackPlugin from 'tsconfig-paths-webpack-plugin';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const TsconfigPathsPlugin = TsconfigPathsWebpackPlugin.default || TsconfigPathsWebpackPlugin;

const config = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, '../../../tsconfig.json'),
      }),
    ],
    alias: {
      '~': path.resolve(__dirname, '../../'),
      '~/__tests__/cypress': path.resolve(__dirname, './cypress'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, '../../../tsconfig.json'),
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(jpg|jpeg|png|gif|svg)$/i,
        type: 'asset/inline',
      },
    ],
  },
};

export default config;
