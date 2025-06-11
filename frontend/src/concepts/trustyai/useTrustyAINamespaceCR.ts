import React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { TrustyAIKind } from '#~/k8sTypes';
import { getTrustyAICR } from '#~/api';
import { FAST_POLL_INTERVAL } from '#~/utilities/const';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { getTrustyStatusState } from '#~/concepts/trustyai/utils';
import { TrustyInstallState } from '#~/concepts/trustyai/types';

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
