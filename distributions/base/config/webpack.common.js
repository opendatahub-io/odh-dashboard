const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const RELATIVE_DIRNAME = path.resolve(__dirname, '..');
const SRC_DIR = path.resolve(RELATIVE_DIRNAME, 'src');
const DIST_DIR = path.resolve(RELATIVE_DIRNAME, 'public');
module.exports = () => ({
  entry: {
    app: path.join(SRC_DIR, 'index.tsx'),
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx|js)?$/,
        exclude: /node_modules/,
        include: [SRC_DIR],
        use: [{ loader: 'swc-loader' }],
      },
      {
        test: /\.(svg|ttf|eot|woff|woff2)$/,
        include: [
          path.resolve(RELATIVE_DIRNAME, '../../node_modules/@patternfly/patternfly/assets/fonts'),
          path.resolve(RELATIVE_DIRNAME, '../../node_modules/@patternfly/patternfly/assets/pficon'),
        ],
        use: {
          loader: 'file-loader',
          options: {
            limit: 5000,
            outputPath: 'fonts',
            name: '[name].[ext]',
          },
        },
      },
      {
        test: /\.svg$/,
        include: (input) => input.indexOf('bgimages') > -1,
        use: {
          loader: 'svg-url-loader',
          options: { limit: 10000 },
        },
      },
      {
        test: /\.svg$/,
        include: (input) =>
          input.indexOf('bgimages') === -1 &&
          input.indexOf('fonts') === -1 &&
          input.indexOf('pficon') === -1,
        use: { loader: 'raw-loader' },
      },
      {
        test: /\.(jpg|jpeg|png|gif)$/i,
        include: [
          SRC_DIR,
          path.resolve(RELATIVE_DIRNAME, '../../node_modules/@patternfly/patternfly/assets/images'),
        ],
        use: [
          {
            loader: 'url-loader',
            options: { limit: 5000, outputPath: 'images', name: '[name].[ext]' },
          },
        ],
      },
      {
        test: /\.s[ac]ss$/i,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  output: {
    filename: '[name].bundle.js',
    path: DIST_DIR,
    publicPath: '/',
    chunkFilename: '[name]-[chunkhash].js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(SRC_DIR, 'index.html'),
      title: 'App Shell',
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx'],
    symlinks: true,
    cacheWithContext: false,
  },
});
