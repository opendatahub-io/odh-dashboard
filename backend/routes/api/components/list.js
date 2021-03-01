const componentUtils = require('./componentUtils');
const constants = require('../../../utils/constants');
const getMockApplications = require('../../../__mocks__/mock-applications/getMockApplications');

module.exports = async function ({ fastify, request }) {
  const applicationDefs = componentUtils.getApplicationDefs();
  if (constants.DEV_MODE) {
    applicationDefs.push(...getMockApplications());
  }

  if (!request.query.installed) {
    return await Promise.all(applicationDefs);
  }

  // Fetch the installed kfDefs
  const kfdefApps = await componentUtils.getInstalledKfdefs(fastify);

  // Get the components associated with the installed KfDefs
  const installedComponents = kfdefApps.reduce((acc, kfdefApp) => {
    const component = applicationDefs.find(
      (ac) => ac.spec.kfdefApplications && ac.spec.kfdefApplications.includes(kfdefApp.name),
    );
    if (component && !acc.includes(component)) {
      acc.push(component);
    }
    return acc;
  }, []);

  return await Promise.all(
    installedComponents.map(async (installedComponent) => {
      if (installedComponent.spec.route) {
        installedComponent.spec.link = await componentUtils.getLink(
          fastify,
          installedComponent.spec.route,
        );
      }
      return installedComponent;
    }),
  );
};
