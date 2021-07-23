import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, OdhApplication } from '../../../types';
import {
  getEnabledConfigMaps,
  getRouteForApplication,
  getRouteForClusterId,
} from '../../../utils/componentUtils';
import {
  getApplicationDefs,
  getInstalledKfdefs,
  getInstalledOperators,
} from '../../../utils/resourceUtils';

export const listComponents = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<OdhApplication[]> => {
  const applicationDefs = getApplicationDefs().map((appDef) => ({
    ...appDef,
    spec: {
      ...appDef.spec,
      getStartedLink: getRouteForClusterId(fastify, appDef.spec.getStartedLink),
    },
  }));

  const query = request.query as { [key: string]: string };
  if (!query.installed) {
    return await Promise.all(applicationDefs);
  }

  // Fetch the installed kfDefs
  const kfdefApps = await getInstalledKfdefs();

  const operatorCSVs = getInstalledOperators();

  // Fetch the enabled config maps
  const enabledCMs = await getEnabledConfigMaps(fastify, applicationDefs);
  const getCSVForApp = (app: OdhApplication) =>
    operatorCSVs.find(
      (operator) => app.spec.csvName && operator.metadata?.name?.startsWith(app.spec.csvName),
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
    installedComponents.map(async (installedComponent: OdhApplication) => {
      installedComponent.spec.link = await getRouteForApplication(
        fastify,
        installedComponent,
        getCSVForApp(installedComponent),
      );
      return installedComponent;
    }),
  );

  return await Promise.all(installedComponents);
};
