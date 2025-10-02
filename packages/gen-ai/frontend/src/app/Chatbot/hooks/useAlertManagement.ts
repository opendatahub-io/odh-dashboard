import * as React from 'react';

export interface UseAlertManagementReturn {
  showUploadSuccessAlert: boolean;
  showDeleteSuccessAlert: boolean;
  showErrorAlert: boolean;
  alertKey: number;
  uploadAlertKey: number;
  deleteAlertKey: number;
  errorAlertKey: number;
  errorMessage: string | undefined;
  onShowUploadSuccessAlert: () => void;
  onShowDeleteSuccessAlert: () => void;
  onShowErrorAlert: (message?: string) => void;
  onHideUploadSuccessAlert: () => void;
  onHideDeleteSuccessAlert: () => void;
  onHideErrorAlert: () => void;
}

const useAlertManagement = (): UseAlertManagementReturn => {
  const [alertKey, setAlertKey] = React.useState<number>(0);
  const [uploadAlertKey, setUploadAlertKey] = React.useState<number>(0);
  const [deleteAlertKey, setDeleteAlertKey] = React.useState<number>(0);
  const [errorAlertKey, setErrorAlertKey] = React.useState<number>(0);
  const [showUploadSuccessAlert, setShowUploadSuccessAlert] = React.useState(false);
  const [showDeleteSuccessAlert, setShowDeleteSuccessAlert] = React.useState(false);
  const [showErrorAlert, setShowErrorAlert] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();

  const showUploadSuccAlert = React.useCallback(() => {
    // Reset the alert first, then show it with a new key
    setShowUploadSuccessAlert(false);
    setUploadAlertKey((key) => key + 1);
    setAlertKey((key) => key + 1);
    // Use requestAnimationFrame to ensure the reset happens before showing
    requestAnimationFrame(() => {
      setShowUploadSuccessAlert(true);
      // Add manual timeout as backup
      setTimeout(() => {
        setShowUploadSuccessAlert(false);
      }, 4000);
    });
  }, []);

  const showDeleteSuccAlert = React.useCallback(() => {
    // Reset the alert first, then show it with a new key
    setShowDeleteSuccessAlert(false);
    setDeleteAlertKey((key) => key + 1);
    setAlertKey((key) => key + 1);
    // Use requestAnimationFrame to ensure the reset happens before showing
    requestAnimationFrame(() => {
      setShowDeleteSuccessAlert(true);
      // Add manual timeout as backup
      setTimeout(() => {
        setShowDeleteSuccessAlert(false);
      }, 4000);
    });
  }, []);

  const showErrAlert = React.useCallback((message?: string) => {
    // Reset the alert first, then show it with a new key
    setShowErrorAlert(false);
    setErrorAlertKey((key) => key + 1);
    setAlertKey((key) => key + 1);
    setErrorMessage(message);
    // Use requestAnimationFrame to ensure the reset happens before showing
    requestAnimationFrame(() => {
      setShowErrorAlert(true);
      // Add manual timeout as backup
      setTimeout(() => {
        setShowErrorAlert(false);
        setErrorMessage(undefined);
      }, 4000);
    });
  }, []);

  const hideUploadSuccessAlert = React.useCallback(() => {
    setShowUploadSuccessAlert(false);
  }, []);

  const hideDeleteSuccessAlert = React.useCallback(() => {
    setShowDeleteSuccessAlert(false);
  }, []);

  const hideErrorAlert = React.useCallback(() => {
    setShowErrorAlert(false);
    setErrorMessage(undefined);
  }, []);

  return {
    showUploadSuccessAlert,
    showDeleteSuccessAlert,
    showErrorAlert,
    alertKey,
    uploadAlertKey,
    deleteAlertKey,
    errorAlertKey,
    errorMessage,
    onShowUploadSuccessAlert: showUploadSuccAlert,
    onShowDeleteSuccessAlert: showDeleteSuccAlert,
    onShowErrorAlert: showErrAlert,
    onHideUploadSuccessAlert: hideUploadSuccessAlert,
    onHideDeleteSuccessAlert: hideDeleteSuccessAlert,
    onHideErrorAlert: hideErrorAlert,
  };
};

export default useAlertManagement;
