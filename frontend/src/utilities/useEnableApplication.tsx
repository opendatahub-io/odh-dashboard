import * as React from 'react';
import { AlertVariant } from '@patternfly/react-core';
import * as _ from 'lodash-es';
import { getValidationStatus, postValidateIsv } from '~/services/validateIsvService';
import {
  enableIntegrationApp,
  getIntegrationAppEnablementStatus,
} from '~/services/integrationAppService';
import { addNotification, forceComponentsUpdate } from '~/redux/actions/actions';
import { useAppDispatch } from '~/redux/hooks';
import { IntegrationAppStatus, VariablesValidationStatus } from '~/types';
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
  const [lastVariablesValidationTimestamp, setLastVariablesValidationTimestamp] =
    React.useState<string>('');
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
      const shouldContinueWatching = (response: IntegrationAppStatus): boolean => {
        if (!_.isEqual(response.variablesValidationTimestamp, lastVariablesValidationTimestamp)) {
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
              setLastVariablesValidationTimestamp(response.variablesValidationTimestamp || '');
              setEnableStatus({
                status:
                  response.variablesValidationStatus === VariablesValidationStatus.SUCCESS
                    ? EnableApplicationStatus.SUCCESS
                    : EnableApplicationStatus.FAILED,
                error:
                  response.variablesValidationStatus === VariablesValidationStatus.SUCCESS
                    ? ''
                    : response.error,
              });
              dispatchResults(
                response.variablesValidationStatus === VariablesValidationStatus.SUCCESS
                  ? undefined
                  : response.error,
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
  }, [
    appId,
    dispatchResults,
    enableStatus.status,
    internalRoute,
    lastVariablesValidationTimestamp,
  ]);

  React.useEffect(() => {
    let closed = false;
    if (doEnable) {
      if (isInternalRouteIntegrationsApp(internalRoute)) {
        enableIntegrationApp(internalRoute, enableValues)
          .then((response) => {
            if (!closed) {
              if (response.isInstalled && response.canInstall) {
                setEnableStatus({ status: EnableApplicationStatus.INPROGRESS, error: '' });
                setLastVariablesValidationTimestamp(response.variablesValidationTimestamp || '');

                if (
                  response.variablesValidationTimestamp !== '' &&
                  lastVariablesValidationTimestamp !== '' &&
                  response.variablesValidationTimestamp !== lastVariablesValidationTimestamp &&
                  response.variablesValidationStatus !== VariablesValidationStatus.UNKNOWN
                ) {
                  setEnableStatus({
                    status:
                      response.variablesValidationStatus === VariablesValidationStatus.SUCCESS
                        ? EnableApplicationStatus.SUCCESS
                        : EnableApplicationStatus.FAILED,
                    error:
                      response.variablesValidationStatus === VariablesValidationStatus.SUCCESS
                        ? ''
                        : response.error,
                  });
                  dispatchResults(
                    response.variablesValidationStatus === VariablesValidationStatus.SUCCESS
                      ? undefined
                      : response.error,
                  );
                }
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
  }, [
    appId,
    appName,
    dispatch,
    dispatchResults,
    doEnable,
    enableValues,
    internalRoute,
    lastVariablesValidationTimestamp,
  ]);
  return [enableStatus.status, enableStatus.error];
};
