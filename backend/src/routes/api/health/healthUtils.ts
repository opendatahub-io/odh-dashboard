import { getDashboardConfig } from '../../../utils/resourceUtils';
import { KubeFastifyInstance } from '../../../types';
import { createCustomError } from '../../../utils/requestUtils';

export const health = async (fastify: KubeFastifyInstance): Promise<{ health: string }> => {
  const kubeContext = fastify.kube?.currentContext || '';
  if (!kubeContext && !kubeContext.trim()) {
    const error = createCustomError('failed to get kube status', 'Failed to get Kube context', 503);
    fastify.log.error(error, 'failed to get status');
    throw error;
  } else if (!getDashboardConfig()) {
    const error = createCustomError(
      'failed to get dashboard config',
      'Failed to get dashboard config',
      503,
    );
    fastify.log.error(error, 'failed to get dashboard config');
    throw error;
  } else {
    throw new Error('this is a made up error for testing');
    // return { health: 'ok' };
  }
};
