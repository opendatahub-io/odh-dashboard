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
      let responseReceived = false;
      axios
        .get('/api/status')
        .then((response) => {
          responseReceived = true;
          if (cancelled) {
            return;
          }
          dispatch(getUserFulfilled(response.data));
          hasDetectedUser.current = true;
        })
        .catch((e) => {
          if (cancelled || (hasDetectedUser.current && !responseReceived && !e?.response)) {
            return;
          }
          const error = responseReceived
            ? new Error('Unable to process user status response')
            : e?.response?.data ?? new Error(e?.message ?? 'Unknown error occurred');
          dispatch(getUserRejected(error));
        });
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
