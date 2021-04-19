const componentUtils = require('./componentUtils');

module.exports = async ({ fastify, request }) => {
  const applicationDefs = componentUtils.getApplicationDefs();

  if (!request.query.installed) {
    return await Promise.all(applicationDefs);
  }

  // Fetch the installed kfDefs
  const kfdefApps = await componentUtils.getInstalledKfdefs(fastify);

  // Fetch the installed kfDefs
  const operatorCSVs = await componentUtils.getInstalledOperators(fastify);

  const getCSVForApp = (app) =>
    operatorCSVs.find(
      (operator) => app.spec.csvName && operator.metadata.name.startsWith(app.spec.csvName),
    );

  // Get the components associated with the installed KfDefs or operators
  const installedComponents = applicationDefs.reduce((acc, app) => {
    if (getCSVForApp(app)) {
      acc.push(app);
      return acc;
    }

    if (
      app.spec.kfdefApplications &&
      kfdefApps.find((kfdefApp) => app.spec.kfdefApplications.includes(kfdefApp.name))
    ) {
      acc.push(app);
      return acc;
    }

    return acc;
  }, []);

  return await Promise.all(
    installedComponents.map(async (installedComponent) => {
      if (installedComponent.spec.route) {
        const csv = getCSVForApp(installedComponent);
        if (csv) {
          installedComponent.spec.link = await componentUtils.getLink(
            fastify,
            installedComponent.spec.route,
            installedComponent.spec.routeNamespace || csv.metadata.namespace,
            installedComponent.spec.routeSuffix,
          );
        } else {
          installedComponent.spec.link = await componentUtils.getLink(
            fastify,
            installedComponent.spec.route,
          );
        }
      }
      return installedComponent;
    }),
  );
};
