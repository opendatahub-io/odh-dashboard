import * as React from 'react';
import { AlertVariant } from '@patternfly/react-core';
import { getValidationStatus, postValidateIsv } from '~/services/validateIsvService';
import {
  enableIntegrationApp,
  getIntegrationAppEnablementStatus,
} from '~/services/integrationAppService';
import { addNotification, forceComponentsUpdate } from '~/redux/actions/actions';
import { useAppDispatch } from '~/redux/hooks';
import { isInternalRouteStartsWithSlashAPI } from './utils';

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
  internalRoute?: string,
): [EnableApplicationStatus, string] => {
  const [enableStatus, setEnableStatus] = React.useState<{
    status: EnableApplicationStatus;
    error: string;
  }>({ status: EnableApplicationStatus.IDLE, error: '' });
  const dispatch = useAppDispatch();

  const dispatchResults = React.useCallback(
    (error?: string) => {
      if (!error) {
        dispatch(
          addNotification({
            status: AlertVariant.success,
            title: `${appName} has been added to the Enabled page.`,
            timestamp: new Date(),
          }),
        );
        dispatch(forceComponentsUpdate());
        return;
      }
      dispatch(
        addNotification({
          status: AlertVariant.danger,
          title: `Error attempting to validate ${appName}.`,
          message: error,
          timestamp: new Date(),
        }),
      );
    },
    [appName, dispatch],
  );

  React.useEffect(() => {
    if (!doEnable) {
      setEnableStatus({ status: EnableApplicationStatus.IDLE, error: '' });
    }
  }, [doEnable]);

  React.useEffect(() => {
    let cancelled = false;
    let watchHandle: ReturnType<typeof setTimeout>;
    if (enableStatus.status === EnableApplicationStatus.INPROGRESS) {
      const watchStatus = () => {
        if (internalRoute && isInternalRouteStartsWithSlashAPI(internalRoute)) {
          getIntegrationAppEnablementStatus(internalRoute)
            .then((response) => {
              if (!response.isAppEnabled) {
                watchHandle = setTimeout(watchStatus, 10 * 1000);
                return;
              }
              setEnableStatus({
                status: EnableApplicationStatus.SUCCESS,
                error: '',
              });
              dispatchResults(undefined);
            })
            .catch((e) => {
              if (!cancelled) {
                setEnableStatus({ status: EnableApplicationStatus.FAILED, error: e.message });
              }
              dispatchResults(e.message);
            });
        } else {
          getValidationStatus(appId)
            .then((response) => {
              if (!response.complete) {
                watchHandle = setTimeout(watchStatus, 10 * 1000);
                return;
              }
              setEnableStatus({
                status: response.valid
                  ? EnableApplicationStatus.SUCCESS
                  : EnableApplicationStatus.FAILED,
                error: response.valid ? '' : response.error,
              });
              dispatchResults(response.valid ? undefined : response.error);
            })
            .catch((e) => {
              if (!cancelled) {
                setEnableStatus({ status: EnableApplicationStatus.FAILED, error: e.message });
              }
              dispatchResults(e.message);
            });
        }
      };
      watchStatus();
    }
    return () => {
      cancelled = true;
      clearTimeout(watchHandle);
    };
  }, [appId, dispatchResults, enableStatus.status, internalRoute]);

  React.useEffect(() => {
    let closed = false;
    if (doEnable) {
      //check the internal route to see if there '/api', if yes, we call the api from internal route, otherwise use previous logic.
      if (internalRoute && isInternalRouteStartsWithSlashAPI(internalRoute)) {
        enableIntegrationApp(internalRoute, enableValues)
          .then((response) => {
            if (!closed) {
              if (!response.isAppEnabled) {
                setEnableStatus({ status: EnableApplicationStatus.INPROGRESS, error: '' });
                return;
              }

              setEnableStatus({
                status: EnableApplicationStatus.SUCCESS,
                error: response.error ? '' : response.error,
              });
            }
            dispatchResults(response.isAppEnabled ? undefined : response.error);
          })
          .catch((e) => {
            if (!closed) {
              setEnableStatus({ status: EnableApplicationStatus.FAILED, error: e.m });
            }
            dispatchResults(e.message);
          });
      } else {
        postValidateIsv(appId, enableValues)
          .then((response) => {
            if (!closed) {
              if (!response.complete) {
                setEnableStatus({ status: EnableApplicationStatus.INPROGRESS, error: '' });
                return;
              }

              setEnableStatus({
                status: response.valid
                  ? EnableApplicationStatus.SUCCESS
                  : EnableApplicationStatus.FAILED,
                error: response.valid ? '' : response.error,
              });
            }
            dispatchResults(response.valid ? undefined : response.error);
          })
          .catch((e) => {
            if (!closed) {
              setEnableStatus({ status: EnableApplicationStatus.FAILED, error: e.m });
            }
            dispatchResults(e.message);
          });
      }
    }

    return () => {
      closed = true;
    };
  }, [appId, appName, dispatch, dispatchResults, doEnable, enableValues, internalRoute]);
  return [enableStatus.status, enableStatus.error];
};
