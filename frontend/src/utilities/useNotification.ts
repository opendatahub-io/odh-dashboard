import * as React from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../redux/actions/actions';

type SuccessProps = (title: string) => void;
type ErrorProps = (title: string, message?: React.ReactNode) => void;

const useNotification = (): {
  success: SuccessProps;
  error: ErrorProps;
} => {
  const dispatch = useDispatch();

  const success: SuccessProps = React.useCallback(
    (title) => {
      dispatch(
        addNotification({
          status: 'success',
          title,
          timestamp: new Date(),
        }),
      );
    },
    [dispatch],
  );

  const error: ErrorProps = React.useCallback(
    (title, message?) => {
      dispatch(
        addNotification({
          status: 'danger',
          title,
          message,
          timestamp: new Date(),
        }),
      );
    },
    [dispatch],
  );

  return { success, error };
};

export default useNotification;
