const { OdhFederationPlugin } = require('@odh-dashboard/app-config/webpack');

module.exports = {
  moduleFederationPlugins: [
    new OdhFederationPlugin({
      name: 'genAi',
      isHost: process.env.DEPLOYMENT_MODE === 'standalone',
      exposes: {
        './extensions': './src/odh/extensions',
        './extension-points': './src/odh/extension-points',
        './EmbeddableChatbotPlayground': './src/app/Chatbot/EmbeddableChatbotPlayground',
      },
      dts: false,
    }),
  ],
};
