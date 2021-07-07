import * as React from 'react';
import { useDispatch } from 'react-redux';
import { postValidateIsv } from '../services/validateIsvService';
import { addNotification, forceComponentsUpdate } from '../redux/actions/actions';

export enum EnableApplicationStatus {
  INPROGRESS,
  SUCCESS,
  FAILED,
  IDLE,
}

export const useEnableApplication = (
  doEnable: boolean,
  appId: string,
  appName: string,
  enableValues: { [key: string]: string },
): [EnableApplicationStatus, string] => {
  const [error, setError] = React.useState<string>('');
  const [status, setStatus] = React.useState<EnableApplicationStatus>(EnableApplicationStatus.IDLE);
  const dispatch = useDispatch();

  React.useEffect(() => {
    if (!doEnable) {
      setError('');
      setStatus(EnableApplicationStatus.IDLE);
    }
  }, [doEnable]);

  React.useEffect(() => {
    let closed;
    if (doEnable) {
      setStatus(EnableApplicationStatus.INPROGRESS);
      postValidateIsv(appId, enableValues)
        .then((response) => {
          if (!closed) {
            if (!response.valid) {
              setError(response.error);
            }
            setStatus(
              response.valid ? EnableApplicationStatus.SUCCESS : EnableApplicationStatus.FAILED,
            );
          }
          if (response.valid) {
            dispatch(
              addNotification({
                status: 'success',
                title: `${appName} has been added to the Enabled page.`,
                timestamp: new Date(),
              }),
            );
            dispatch(forceComponentsUpdate());
            return;
          }
          dispatch(
            addNotification({
              status: 'danger',
              title: `Error attempting to validate ${appName}.`,
              message: response.error,
              timestamp: new Date(),
            }),
          );
        })
        .catch((e) => {
          if (!closed) {
            setError(e.message);
            setStatus(EnableApplicationStatus.FAILED);
          }
          dispatch(
            addNotification({
              status: 'danger',
              title: `Error attempting to validate ${appName}.`,
              message: e.message,
              timestamp: new Date(),
            }),
          );
        });
    }

    return () => {
      closed = true;
    };
  }, [appId, appName, dispatch, doEnable, enableValues]);
  return [status, error];
};
