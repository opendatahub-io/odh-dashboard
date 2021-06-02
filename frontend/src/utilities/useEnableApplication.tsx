import * as React from 'react';
import { useDispatch } from 'react-redux';
import { postValidateIsv } from '../services/validateIsvService';
import { addNotification, forceComponentsUpdate } from '../redux/actions/actions';

export const useEnableApplication = (
  doEnable: boolean,
  appId: string,
  appName: string,
  enableValues: { [key: string]: string },
): { complete: boolean; error: boolean } => {
  const [complete, setComplete] = React.useState<boolean>(false);
  const [error, setError] = React.useState<boolean>(false);
  const dispatch = useDispatch();

  React.useEffect(() => {
    let closed;
    if (doEnable) {
      setComplete(false);
      setError(false);
      postValidateIsv(appId, enableValues)
        .then((valid) => {
          if (!closed) {
            setError(!valid);
            setComplete(true);
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
            setError(true);
            setComplete(true);
          }
        });
    }

    return () => {
      closed = true;
    };
  }, [appId, appName, dispatch, doEnable, enableValues]);
  return { error, complete };
};
