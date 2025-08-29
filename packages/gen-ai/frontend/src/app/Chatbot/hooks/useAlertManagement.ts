import * as React from 'react';

export interface UseAlertManagementReturn {
  showSuccessAlert: boolean;
  showErrorAlert: boolean;
  alertKey: number;
  onShowSuccessAlert: () => void;
  onShowErrorAlert: () => void;
  onHideSuccessAlert: () => void;
  onHideErrorAlert: () => void;
}

const useAlertManagement = (): UseAlertManagementReturn => {
  const [alertKey, setAlertKey] = React.useState<number>(0);
  const [showSuccessAlert, setShowSuccessAlert] = React.useState(false);
  const [showErrorAlert, setShowErrorAlert] = React.useState(false);

  const showSuccAlert = React.useCallback(() => {
    setAlertKey((key) => key + 1);
    setShowSuccessAlert(true);
  }, []);

  const showErrAlert = React.useCallback(() => {
    setAlertKey((key) => key + 1);
    setShowErrorAlert(true);
  }, []);

  const hideSuccessAlert = React.useCallback(() => {
    setShowSuccessAlert(false);
  }, []);

  const hideErrorAlert = React.useCallback(() => {
    setShowErrorAlert(false);
  }, []);

  return {
    showSuccessAlert,
    showErrorAlert,
    alertKey,
    onShowSuccessAlert: showSuccAlert,
    onShowErrorAlert: showErrAlert,
    onHideSuccessAlert: hideSuccessAlert,
    onHideErrorAlert: hideErrorAlert,
  };
};

export default useAlertManagement;
