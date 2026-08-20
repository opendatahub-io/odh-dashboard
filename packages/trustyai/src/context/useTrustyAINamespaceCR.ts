import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { FAST_POLL_INTERVAL } from '@odh-dashboard/ui-core/utilities';
import type { TrustyAIKind } from '@odh-dashboard/k8s-core';
import { TrustyInstallState } from '../types';
import { getTrustyAICR } from '../api/k8s';
import { getTrustyStatusState } from '../utilities/utils';

type State = TrustyAIKind | null;

const useTrustyAINamespaceCR = (namespace: string): FetchState<State> => {
  const trustyAIAreaAvailable = useIsAreaAvailable(SupportedArea.TRUSTY_AI).status;

  const callback = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) => {
      if (!trustyAIAreaAvailable) {
        return Promise.reject(new NotReadyError('Bias metrics is not enabled'));
      }

      return getTrustyAICR(namespace, opts).catch((e) => {
        if (e.statusObject?.code === 404) {
          // Not finding is okay, not an error
          return null;
        }
        throw e;
      });
    },
    [namespace, trustyAIAreaAvailable],
  );

  const [needFastRefresh, setNeedFastRefresh] = React.useState(false);

  const state = useFetchState<State>(callback, null, {
    initialPromisePurity: true,
    refreshRate: needFastRefresh ? FAST_POLL_INTERVAL : undefined,
  });

  const installState = getTrustyStatusState(state);
  const isProgressing = [
    TrustyInstallState.INSTALLING,
    TrustyInstallState.UNINSTALLING,
    TrustyInstallState.CR_ERROR,
  ].includes(installState.type);
  React.useEffect(() => {
    setNeedFastRefresh(isProgressing);
  }, [isProgressing]);

  return state;
};

export default useTrustyAINamespaceCR;
