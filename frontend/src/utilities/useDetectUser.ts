import * as React from 'react';
import axios from '@odh-dashboard/ui-core/utilities/axios';
import { getUserFulfilled, getUserPending, getUserRejected } from '#~/redux/actions/actions';
import { useAppDispatch } from '#~/redux/hooks';
import { POLL_INTERVAL } from './const';

const useDetectUser = (): void => {
  const dispatch = useAppDispatch();
  const hasDetectedUser = React.useRef(false);

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
    let cancelled = false;
    dispatch(getUserPending());
    function detectUser(): void {
      axios.get('/api/status').then(
        (response) => {
          if (cancelled) {
            return;
          }
          let fulfilledAction: ReturnType<typeof getUserFulfilled> | undefined;
          try {
            fulfilledAction = getUserFulfilled(response.data);
          } catch (e) {
            dispatch(getUserRejected(e instanceof Error ? e : new Error('Unknown error occurred')));
            return;
          }
          dispatch(fulfilledAction);
          hasDetectedUser.current = true;
        },
        (e) => {
          if (cancelled || (hasDetectedUser.current && !e?.response)) {
            return;
          }
          dispatch(
            getUserRejected(e?.response?.data ?? new Error(e?.message ?? 'Unknown error occurred')),
          );
        },
      );
      watchHandle = setTimeout(detectUser, POLL_INTERVAL);
    }
    detectUser();

    return () => {
      cancelled = true;
      clearTimeout(watchHandle);
    };
  }, [dispatch]);
};

export default useDetectUser;
