const quickStartUtils = require('./quickStartUtils');

module.exports = async ({ fastify }) => {
  // Fetch the installed quick starts
  const quickStarts = await quickStartUtils.getInstalledQuickStarts(fastify);

  return await Promise.all(quickStarts);
};
