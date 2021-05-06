import { FastifyRequest } from 'fastify';
import { ODHApp } from '@common/types';
import { KubeFastifyInstance } from '../../../types';
import {
  getApplicationDefs,
  getEnabledConfigMaps,
  getInstalledKfdefs,
  getLink,
  getServiceLink,
} from '../../../utils/componentUtils';
import { getInstalledOperators } from '../../../utils/watchInstalledOperators';
import { getServices } from '../../../utils/watchServices';

export const listComponents = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<ODHApp[]> => {
  const applicationDefs = getApplicationDefs();

  // Fetch the installed kfDefs
  const kfdefApps = await getInstalledKfdefs(fastify);

  const operatorCSVs = getInstalledOperators();
  const services = getServices();

  // Fetch the enabled config maps
  const enabledCMs = await getEnabledConfigMaps(fastify, applicationDefs);
  const getCSVForApp = (app: ODHApp) =>
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
    installedComponents.map(async (installedComponent: ODHApp) => {
      if (installedComponent.spec.route) {
        const csv = getCSVForApp(installedComponent);
        if (csv) {
          installedComponent.spec.link = await getLink(
            fastify,
            installedComponent.spec.route,
            installedComponent.spec.routeNamespace || csv.metadata.namespace,
            installedComponent.spec.routeSuffix,
          );
        } else {
          installedComponent.spec.link = await getLink(fastify, installedComponent.spec.route);
        }
      }
      if (!installedComponent.spec.link && installedComponent.spec.serviceName) {
        installedComponent.spec.link = await getServiceLink(
          fastify,
          services,
          installedComponent.spec.serviceName,
          installedComponent.spec.routeSuffix,
        );
      }
      return installedComponent;
    }),
  );

  const query = request.query as { [key: string]: string };
  if (!query.installed) {
    return await Promise.all(applicationDefs);
  }

  return await Promise.all(installedComponents);
};
