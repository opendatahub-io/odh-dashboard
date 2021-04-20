const componentUtils = require('./componentUtils');

module.exports = async ({ fastify, request }) => {
  const applicationDefs = componentUtils.getApplicationDefs();

  // Fetch the installed kfDefs
  const kfdefApps = await componentUtils.getInstalledKfdefs(fastify);

  // Fetch the installed kfDefs
  const operatorCSVs = await componentUtils.getInstalledOperators(fastify);

  // Fetch the enabled config maps
  const enabledCMs = await componentUtils.getEnabledConfigMaps(fastify, applicationDefs);
  const getCSVForApp = (app) =>
    operatorCSVs.find(
      (operator) => app.spec.csvName && operator.metadata.name.startsWith(app.spec.csvName),
    );

  // Get the components associated with the installed KfDefs or operators
  const installedComponents = applicationDefs.reduce((acc, app) => {
    if (getCSVForApp(app)) {
      app.spec.isEnabled = true;
      acc.push(app);
      return acc;
    }

    if (
      app.spec.kfdefApplications &&
      kfdefApps.find((kfdefApp) => app.spec.kfdefApplications.includes(kfdefApp.name))
    ) {
      app.spec.isEnabled = true;
      acc.push(app);
      return acc;
    }

    if (app.spec.enable) {
      const cm = enabledCMs.find(
        (enabledCM) => enabledCM?.metadata.name === app.spec.enable?.validationConfigMap,
      );
      if (cm) {
        if (cm.data?.validation_result === 'true') {
          app.spec.isEnabled = true;
          acc.push(app);
          return acc;
        }
      }
    }
    return acc;
  }, []);

  await Promise.all(
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

  if (!request.query.installed) {
    return await Promise.all(applicationDefs);
  }

  return await Promise.all(installedComponents);
};
