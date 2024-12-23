import * as React from 'react';
import { AlertVariant } from '@patternfly/react-core';
import { getValidationStatus, postValidateIsv } from '~/services/validateIsvService';
import {
  enableIntegrationApp,
  getIntegrationAppEnablementStatus,
} from '~/services/integrationAppService';
import { addNotification, forceComponentsUpdate } from '~/redux/actions/actions';
import { useAppDispatch } from '~/redux/hooks';
import { VariablesValidationStatus } from '~/types';
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

  React.useEffect(() => {
    let cancelled = false;
    let watchHandle: ReturnType<typeof setTimeout>;
    if (enableStatus.status === EnableApplicationStatus.INPROGRESS) {
      const watchStatus = () => {
        if (isInternalRouteIntegrationsApp(internalRoute)) {
          getIntegrationAppEnablementStatus(internalRoute)
            .then((response) => {
              if (
                response.isInstalled &&
                response.canInstall &&
                response.variablesValidationStatus === VariablesValidationStatus.UNKNOWN
              ) {
                watchHandle = setTimeout(watchStatus, 10 * 1000);
                return;
              }
              setEnableStatus({
                status:
                  response.variablesValidationStatus === VariablesValidationStatus.SUCCESS
                    ? EnableApplicationStatus.SUCCESS
                    : EnableApplicationStatus.FAILED,
                error:
                  response.variablesValidationStatus === VariablesValidationStatus.SUCCESS
                    ? ''
                    : 'Variables are not valid',
              });
              dispatchResults(
                response.variablesValidationStatus === VariablesValidationStatus.SUCCESS
                  ? undefined
                  : 'Variables are not valid',
              );
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
        enableIntegrationApp(internalRoute, enableValues)
          .then((response) => {
            if (!closed) {
              if (
                response.isInstalled &&
                response.canInstall &&
                response.variablesValidationStatus === VariablesValidationStatus.UNKNOWN
              ) {
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
