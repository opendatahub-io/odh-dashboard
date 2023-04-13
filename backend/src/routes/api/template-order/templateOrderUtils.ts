import { setDashboardConfig } from '../config/configUtils';
import { getDashboardConfig } from '../../../utils/resourceUtils';
import { KubeFastifyInstance } from '../../../types';
import { FastifyRequest } from 'fastify';

export const getTemplateOrder = (): string[] => {
  if (typeof getDashboardConfig().spec.groupsConfig !== 'undefined') {
    return getDashboardConfig().spec.templateOrder;
  }
  throw new Error(`Failed to retrieve Dashboard CR order configuration`);
};

export const updateTemplateOrder = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{ Body: string[] }>,
): Promise<string[]> => {
  try {
    const updatedConfig = await setDashboardConfig(fastify, {
      spec: {
        templateOrder: request.body,
      },
    });
    return updatedConfig.spec.templateOrder;
  } catch (e) {
    throw new Error(`Failed to update Dashboard CR order configuration`);
  }
};
