import * as React from 'react';
import axios from '#~/utilities/axios';
import { getUserFulfilled, getUserPending, getUserRejected } from '#~/redux/actions/actions';
import { useAppDispatch } from '#~/redux/hooks';
import { POLL_INTERVAL } from './const';

const useDetectUser = (): void => {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
    let cancelled = false;
    dispatch(getUserPending());
    const detectUser = () => {
      axios
        .get('/api/status')
        .then((response) => {
          if (cancelled) {
            return;
          }
          dispatch(getUserFulfilled(response.data));
        })
        .catch((e) => {
          if (cancelled) {
            return;
          }
          dispatch(getUserRejected(e.response.data));
        });
      watchHandle = setTimeout(detectUser, POLL_INTERVAL);
    };
    detectUser();

    return () => {
      cancelled = true;
      clearTimeout(watchHandle);
    };
  }, [dispatch]);
};

export default useDetectUser;
