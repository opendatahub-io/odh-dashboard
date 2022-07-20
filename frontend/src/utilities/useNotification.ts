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

  const success: SuccessProps = (title) => {
    dispatch(
      addNotification({
        status: 'success',
        title,
        timestamp: new Date(),
      }),
    );
  };

  const error: ErrorProps = (title, message?) => {
    dispatch(
      addNotification({
        status: 'danger',
        title,
        message,
        timestamp: new Date(),
      }),
    );
  };
  return { success, error };
};

export default useNotification;
