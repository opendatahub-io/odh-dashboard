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
  const [lastFailedValues, setLastFailedValues] = React.useState<{ [key: string]: string }>({});
  const [pollCount, setPollCount] = React.useState(0);
  const [notificationSent, setNotificationSent] = React.useState(false);
  const MAX_POLL_ATTEMPTS = 30; // Set a maximum polling limit
  const dispatch = useAppDispatch();

  const dispatchResults = React.useCallback(
    (error?: string) => {
      if (notificationSent) {
        return;
      } // Skip if notification already sent for this validation attempt

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

      setNotificationSent(true);
    },
    [appName, dispatch, notificationSent],
  );

  React.useEffect(() => {
    if (!doEnable) {
      setEnableStatus({ status: EnableApplicationStatus.IDLE, error: '' });
      setPollCount(0);
      setNotificationSent(false);
    }
  }, [doEnable]);

  // Check if current values match previously failed values
  const isResubmittingFailedValues = React.useMemo(
    () => !_.isEmpty(lastFailedValues) && _.isEqual(enableValues, lastFailedValues),
    [enableValues, lastFailedValues],
  );

  React.useEffect(() => {
    // If trying to submit the same failed values, immediately show the previous error
    if (doEnable && isResubmittingFailedValues) {
      setEnableStatus({
        status: EnableApplicationStatus.FAILED,
        error: 'Validation failed with this key. Please try a different key.',
      });
      dispatchResults('Validation failed with key. Please try a different key.');
    }
  }, [doEnable, isResubmittingFailedValues, dispatchResults]);

  React.useEffect(() => {
    let cancelled = false;
    let watchHandle: ReturnType<typeof setTimeout>;

    if (enableStatus.status === EnableApplicationStatus.INPROGRESS) {
      const shouldContinueWatching = (response: IntegrationAppStatus): boolean => {
        // Stop watching if we've polled too many times
        if (pollCount >= MAX_POLL_ATTEMPTS) {
          return false;
        }

        // Stop if the timestamp has changed
        if (!_.isEqual(response.variablesValidationTimestamp, lastVariablesValidationTimestamp)) {
          return false;
        }

        return true;
      };

      const watchStatus = () => {
        if (isInternalRouteIntegrationsApp(internalRoute)) {
          getIntegrationAppEnablementStatus(internalRoute)
            .then((response) => {
              if (!cancelled) {
                setPollCount((prevCount) => prevCount + 1);

                if (shouldContinueWatching(response)) {
                  // If we've reached the maximum poll attempts, fail with timeout
                  if (pollCount >= MAX_POLL_ATTEMPTS - 1) {
                    setEnableStatus({
                      status: EnableApplicationStatus.FAILED,
                      error: 'Validation timed out. Please try again later.',
                    });
                    dispatchResults('Validation timed out. Please try again later.');
                    return;
                  }

                  watchHandle = setTimeout(watchStatus, 10 * 1000);
                  return;
                }

                setLastVariablesValidationTimestamp(response.variablesValidationTimestamp || '');
                const isSuccess =
                  response.variablesValidationStatus === VariablesValidationStatus.SUCCESS;

                setEnableStatus({
                  status: isSuccess
                    ? EnableApplicationStatus.SUCCESS
                    : EnableApplicationStatus.FAILED,
                  error: isSuccess ? '' : response.error,
                });

                // If validation failed, store the values that failed
                if (!isSuccess) {
                  setLastFailedValues({ ...enableValues });
                } else {
                  setLastFailedValues({});
                }

                dispatchResults(isSuccess ? undefined : response.error);
              }
            })
            .catch((e) => {
              if (!cancelled) {
                setEnableStatus({ status: EnableApplicationStatus.FAILED, error: e.message });
                setLastFailedValues({ ...enableValues });
              }
              dispatchResults(e.message);
            });
        } else {
          getValidationStatus(appId)
            .then((response) => {
              if (!cancelled) {
                setPollCount((prevCount) => prevCount + 1);

                if (!response.complete) {
                  // If we've reached the maximum poll attempts, fail with timeout
                  if (pollCount >= MAX_POLL_ATTEMPTS - 1) {
                    setEnableStatus({
                      status: EnableApplicationStatus.FAILED,
                      error: 'Validation timed out. Please try again later.',
                    });
                    dispatchResults('Validation timed out. Please try again later.');
                    return;
                  }

                  watchHandle = setTimeout(watchStatus, 10 * 1000);
                  return;
                }

                setEnableStatus({
                  status: response.valid
                    ? EnableApplicationStatus.SUCCESS
                    : EnableApplicationStatus.FAILED,
                  error: response.valid ? '' : response.error,
                });

                // If validation failed, store the values that failed
                if (!response.valid) {
                  setLastFailedValues({ ...enableValues });
                } else {
                  setLastFailedValues({});
                }

                dispatchResults(response.valid ? undefined : response.error);
              }
            })
            .catch((e) => {
              if (!cancelled) {
                setEnableStatus({ status: EnableApplicationStatus.FAILED, error: e.message });
                setLastFailedValues({ ...enableValues });
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
    enableValues,
    internalRoute,
    lastVariablesValidationTimestamp,
    pollCount,
  ]);

  React.useEffect(() => {
    let closed = false;
    if (doEnable && !isResubmittingFailedValues) {
      setPollCount(0);
      setNotificationSent(false);

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
                  const isSuccess =
                    response.variablesValidationStatus === VariablesValidationStatus.SUCCESS;

                  setEnableStatus({
                    status: isSuccess
                      ? EnableApplicationStatus.SUCCESS
                      : EnableApplicationStatus.FAILED,
                    error: isSuccess ? '' : response.error,
                  });

                  // If validation failed, store the values that failed
                  if (!isSuccess) {
                    setLastFailedValues({ ...enableValues });
                  } else {
                    setLastFailedValues({});
                  }

                  dispatchResults(isSuccess ? undefined : response.error);
                }
              }
            }
          })
          .catch((e) => {
            if (!closed) {
              setEnableStatus({ status: EnableApplicationStatus.FAILED, error: e.message });
              setLastFailedValues({ ...enableValues });
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

              const isSuccess = response.valid;

              setEnableStatus({
                status: isSuccess
                  ? EnableApplicationStatus.SUCCESS
                  : EnableApplicationStatus.FAILED,
                error: isSuccess ? '' : response.error,
              });

              // If validation failed, store the values that failed
              if (!isSuccess) {
                setLastFailedValues({ ...enableValues });
              } else {
                setLastFailedValues({});
              }
            }
            dispatchResults(response.valid ? undefined : response.error);
          })
          .catch((e) => {
            if (!closed) {
              setEnableStatus({ status: EnableApplicationStatus.FAILED, error: e.message });
              setLastFailedValues({ ...enableValues });
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
    isResubmittingFailedValues,
  ]);

  return [enableStatus.status, enableStatus.error];
};
