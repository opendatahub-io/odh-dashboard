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

  const installedComponents = [];
  for (const appDef of applicationDefs) {
    const isEnabled = await getIsAppEnabled(fastify, appDef);
    if (isEnabled) {
      const app = {
        ...appDef,
        spec: {
          ...appDef.spec,
          isEnabled: true,
          link: await getRouteForApplication(fastify, appDef),
        },
      };
      installedComponents.push(app);
    }
  }

  return installedComponents;
};
