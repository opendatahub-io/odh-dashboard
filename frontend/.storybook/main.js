const path = require('path');
const { merge } = require('webpack-merge');
const webpackDev = require('../config/webpack.dev.js');

module.exports = merge(webpackDev, {
  features: {
    interactionsDebugger: true,
  },
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    'storybook-addon-react-router-v6',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  webpackFinal: async (config) => {
    config.module.rules.push({
      test: /\.s[ac]ss$/i,
      use: [
        // Creates `style` nodes from JS strings
        'style-loader',
        // Translates CSS into CommonJS
        'css-loader',
        // Compiles Sass to CSS
        'sass-loader',
      ],
    });
    config.resolve.alias['~'] = path.resolve(__dirname, '../src/');
    config.resolve.extensions.push('.ts', '.tsx', '.js', '.jsx');
    return config;
  },
  docs: {
    autodocs: false,
  },
});
