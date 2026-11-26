import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import type {
  ConnectionAccessResource,
  ConnectionAccessVerb,
} from '~/app/utilities/connectionAccess';

export const useConnectionAccess = (
  namespace: string,
  verb: ConnectionAccessVerb,
  resource: ConnectionAccessResource = 'data-connections',
): { isAllowed: boolean; loaded: boolean } => {
  const [isAllowed, loaded] = useAccessReview(
    {
      group: 'dataconnecthub.opendatahub.io',
      resource,
      verb,
      namespace,
    },
    !!namespace,
  );

  return { isAllowed, loaded };
};
