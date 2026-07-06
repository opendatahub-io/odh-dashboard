import { KubeFastifyInstance } from '../../../types';
import { secureRoute } from '../../../utils/route-security';
import { getSubscriptions, isRHOAI } from '../../../utils/resourceUtils';
import { createCustomError } from '../../../utils/requestUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/',
    secureRoute(fastify)(async () => {
      const subscriptions = getSubscriptions();
      const subNamePrefix = isRHOAI(fastify) ? 'rhods-operator' : 'opendatahub-operator';
      const operatorSubscriptionStatus = subscriptions.find((sub) =>
        sub.installedCSV?.includes(subNamePrefix),
      );
      if (operatorSubscriptionStatus) {
        return operatorSubscriptionStatus;
      }
      fastify.log.error(`Failed to find operator subscription, ${subNamePrefix}`);
      throw createCustomError(
        'Subscription unavailable',
        'Unable to get subscription information',
        404,
      );
    }),
  );
};
