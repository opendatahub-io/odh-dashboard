const path = require('path');
const SRC_DIR = process.env._ODH_SRC_DIR;


module.exports = {
  features: {
    interactionsDebugger: true,
  },
  "stories": [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y"
  ],
  "framework": "@storybook/react",
  "core": {
    "builder": "@storybook/builder-webpack5"
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
        'sass-loader'
      ]
    })

    config.resolve.alias['~'] = path.resolve(__dirname, '../src/');
    config.resolve.extensions.push(".ts", ".tsx", ".js", ".jsx");

    return config;
  },
}