import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import type { ConnectionAccessVerb } from '~/app/utilities/connectionAccess';

export const useConnectionAccess = (
  namespace: string,
  verb: ConnectionAccessVerb,
): { isAllowed: boolean; loaded: boolean } => {
  const [isAllowed, loaded] = useAccessReview(
    {
      group: 'dataconnecthub.opendatahub.io',
      resource: 'data-connections',
      verb,
      namespace,
    },
    !!namespace,
  );

  return { isAllowed, loaded };
};
