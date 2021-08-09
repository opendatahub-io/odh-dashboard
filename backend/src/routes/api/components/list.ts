import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, OdhApplication } from '../../../types';
import {
  getIsAppEnabled,
  getRouteForApplication,
  getRouteForClusterId,
} from '../../../utils/componentUtils';
import { getApplicationDefs } from '../../../utils/resourceUtils';

export const listComponents = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<OdhApplication[]> => {
  const applicationDefs = [];
  const installedComponents = [];
  const query = request.query as { [key: string]: string };

  for (const appDef of getApplicationDefs()) {
    applicationDefs.push({
      ...appDef,
      spec: {
        ...appDef.spec,
        getStartedLink: getRouteForClusterId(fastify, appDef.spec.getStartedLink),
        isEnabled: await getIsAppEnabled(fastify, appDef),
      },
    });
  }

  if (!query.installed) {
    return await Promise.all(applicationDefs);
  }

  for (const appDef of applicationDefs) {
    if (appDef.spec.isEnabled) {
      const app = {
        ...appDef,
        spec: {
          ...appDef.spec,
          link: await getRouteForApplication(fastify, appDef),
        },
      };
      installedComponents.push(app);
    }
  }

  return installedComponents;
};
