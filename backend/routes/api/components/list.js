const _ = require('lodash');
const availableComponents = require('./available-components');
const componentUtils = require('./componentUtils');

const PICKED_AVAILABLE_FIELDS = ['key', 'label', 'description', 'img', 'docsLink', 'support'];

module.exports = async function ({ fastify, request }) {
  if (!request.query.installed) {
    return await Promise.all(
      availableComponents.map(async (ac) => {
        return _.pick(ac, PICKED_AVAILABLE_FIELDS);
      }),
    );
  }

  // Fetch the installed kfDefs
  const kfdefApps = await componentUtils.getInstalledKfdefs(fastify);

  // Get the components associated with the installed KfDefs
  const installedComponents = kfdefApps.reduce((acc, kfdefApp) => {
    const component = availableComponents.find(
      (ac) => ac.kfdefApplications && ac.kfdefApplications.includes(kfdefApp.name),
    );
    if (component && !acc.includes(component)) {
      acc.push(component);
    }
    return acc;
  }, []);

  return await Promise.all(
    installedComponents.map(async (ac) => {
      const installedComponent = _.pick(ac, PICKED_AVAILABLE_FIELDS);
      if (ac.route) {
        installedComponent.link = await componentUtils.getLink(fastify, ac.route);
      }
      return installedComponent;
    }),
  );
};
