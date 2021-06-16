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
): EnableApplicationStatus => {
  const [status, setStatus] = React.useState<EnableApplicationStatus>(EnableApplicationStatus.IDLE);
  const dispatch = useDispatch();

  React.useEffect(() => {
    if (!doEnable) {
      setStatus(EnableApplicationStatus.IDLE);
    }
  }, [doEnable]);

  React.useEffect(() => {
    let closed;
    if (doEnable) {
      setStatus(EnableApplicationStatus.INPROGRESS);
      postValidateIsv(appId, enableValues)
        .then((valid) => {
          if (!closed) {
            setStatus(valid ? EnableApplicationStatus.SUCCESS : EnableApplicationStatus.FAILED);
          }
          if (valid) {
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
              timestamp: new Date(),
            }),
          );
        })
        .catch(() => {
          if (!closed) {
            setStatus(EnableApplicationStatus.FAILED);
          }
          dispatch(
            addNotification({
              status: 'danger',
              title: `Error attempting to validate ${appName}.`,
              timestamp: new Date(),
            }),
          );
        });
    }

    return () => {
      closed = true;
    };
  }, [appId, appName, dispatch, doEnable, enableValues]);
  return status;
};
