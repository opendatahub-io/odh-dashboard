import * as React from 'react';
import { checkAccess } from '@odh-dashboard/k8s-core/api/accessReview';

type AccessState = 'checking' | 'allowed' | 'denied' | 'error';

const useDeploymentEventsAccess = (namespace?: string): AccessState => {
  const request = React.useMemo(() => ({ namespace }), [namespace]);
  const [result, setResult] = React.useState<{ request: typeof request; state: AccessState }>();

  React.useEffect(() => {
    if (!request.namespace) {
      return undefined;
    }
    let active = true;
    const review = async () => {
      let state: AccessState;
      try {
        const attributes = { group: '', resource: 'events', namespace: request.namespace };
        const options = { failureMode: 'reject' } as const;
        const [canList, canWatch] = await Promise.all([
          checkAccess({ ...attributes, verb: 'list' }, options),
          checkAccess({ ...attributes, verb: 'watch' }, options),
        ]);
        state = canList && canWatch ? 'allowed' : 'denied';
      } catch {
        state = 'error';
      }
      if (active) {
        setResult({ request, state });
      }
    };
    void review();
    return () => {
      active = false;
    };
  }, [request]);

  return result?.request === request ? result.state : 'checking';
};

export default useDeploymentEventsAccess;
