import * as React from 'react';

export interface UseAlertManagementReturn {
  showSuccessAlert: boolean;
  showErrorAlert: boolean;
  alertKey: number;
  errorMessage: string | undefined;
  onShowSuccessAlert: () => void;
  onShowErrorAlert: (message?: string) => void;
  onHideSuccessAlert: () => void;
  onHideErrorAlert: () => void;
}

const useAlertManagement = (): UseAlertManagementReturn => {
  const [alertKey, setAlertKey] = React.useState<number>(0);
  const [showSuccessAlert, setShowSuccessAlert] = React.useState(false);
  const [showErrorAlert, setShowErrorAlert] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();

  const showSuccAlert = React.useCallback(() => {
    setAlertKey((key) => key + 1);
    setShowSuccessAlert(true);
    // Clear any existing error when showing success
    setShowErrorAlert(false);
    setErrorMessage(undefined);
  }, []);

  const showErrAlert = React.useCallback((message?: string) => {
    setAlertKey((key) => key + 1);
    setShowErrorAlert(true);
    setErrorMessage(message);
    // Clear any existing success when showing error
    setShowSuccessAlert(false);
  }, []);

  const hideSuccessAlert = React.useCallback(() => {
    setShowSuccessAlert(false);
  }, []);

  const hideErrorAlert = React.useCallback(() => {
    setShowErrorAlert(false);
    setErrorMessage(undefined);
  }, []);

  return {
    showSuccessAlert,
    showErrorAlert,
    alertKey,
    errorMessage,
    onShowSuccessAlert: showSuccAlert,
    onShowErrorAlert: showErrAlert,
    onHideSuccessAlert: hideSuccessAlert,
    onHideErrorAlert: hideErrorAlert,
  };
};

export default useAlertManagement;
