import * as React from 'react';
import { AlertVariant } from '@patternfly/react-core';
import { getValidationStatus, postValidateIsv } from '~/services/validateIsvService';
import {
  enableIntegrationApp,
  getIntegrationAppEnablementStatus,
} from '~/services/integrationAppService';
import { addNotification, forceComponentsUpdate } from '~/redux/actions/actions';
import { useAppDispatch } from '~/redux/hooks';
import { IntegrationAppStatus } from '~/types';
import { isInternalRouteIntegrationsApp } from './utils';

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
      dispatch(
        addNotification({
          status: error ? AlertVariant.danger : AlertVariant.success,
          title: error
            ? `Error attempting to validate ${appName}`
            : `${appName} has been added to the Enabled page.`,
          message: error,
          timestamp: new Date(),
        }),
      );

      if (!error) {
        dispatch(forceComponentsUpdate());
      }
    },
    [appName, dispatch],
  );

  React.useEffect(() => {
    if (!doEnable) {
      setEnableStatus({ status: EnableApplicationStatus.IDLE, error: '' });
    }
  }, [doEnable]);

  const baselineTimestampRef = React.useRef<string>('');

  React.useEffect(() => {
    let cancelled = false;
    let watchHandle: ReturnType<typeof setTimeout>;
    if (enableStatus.status === EnableApplicationStatus.INPROGRESS) {
      const baselineTimestamp = baselineTimestampRef.current;
      const shouldContinueWatching = (response: IntegrationAppStatus): boolean => {
        const responseTime = new Date(
          response.variablesValidationTimestamp ?? baselineTimestamp,
        ).getTime();
        const baselineTime = new Date(baselineTimestamp).getTime();
        if (responseTime > baselineTime) {
          return false;
        }
        return true;
      };

      const watchStatus = () => {
        if (isInternalRouteIntegrationsApp(internalRoute)) {
          getIntegrationAppEnablementStatus(internalRoute)
            .then((response) => {
              if (shouldContinueWatching(response)) {
                watchHandle = setTimeout(watchStatus, 10 * 1000);
                return;
              }
              setEnableStatus({
                status: response.isEnabled
                  ? EnableApplicationStatus.SUCCESS
                  : EnableApplicationStatus.FAILED,
                error: response.isEnabled ? '' : response.error,
              });
              dispatchResults(response.isEnabled ? undefined : response.error);
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
      if (isInternalRouteIntegrationsApp(internalRoute)) {
        // Set baseline timestamp 1s earlier to avoid polling loop
        const oneSecondAgo = new Date(Date.now() - 1000);
        baselineTimestampRef.current = oneSecondAgo.toISOString().replace(/\.\d{3}Z$/, 'Z');
        enableIntegrationApp(internalRoute, enableValues)
          .then((response) => {
            if (!closed) {
              if (response.isInstalled && response.canInstall) {
                setEnableStatus({ status: EnableApplicationStatus.INPROGRESS, error: '' });
              }
            }
          })
          .catch((e) => {
            if (!closed) {
              setEnableStatus({ status: EnableApplicationStatus.FAILED, error: e.message });
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
              setEnableStatus({ status: EnableApplicationStatus.FAILED, error: e.message });
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
