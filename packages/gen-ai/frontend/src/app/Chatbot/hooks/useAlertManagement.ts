import * as React from 'react';
import { ALERT_TIMEOUT_MS } from '~/app/Chatbot/const';

export interface UseAlertManagementReturn {
  showSuccessAlert: boolean;
  showUploadSuccessAlert: boolean;
  showDeleteSuccessAlert: boolean;
  showErrorAlert: boolean;
  alertKey: number;
  uploadAlertKey: number;
  deleteAlertKey: number;
  errorAlertKey: number;
  errorMessage: string | undefined;
  onShowSuccessAlert: () => void;
  onShowUploadSuccessAlert: () => void;
  onShowDeleteSuccessAlert: () => void;
  onShowErrorAlert: (message?: string) => void;
  onHideSuccessAlert: () => void;
  onHideUploadSuccessAlert: () => void;
  onHideDeleteSuccessAlert: () => void;
  onHideErrorAlert: () => void;
}

const useAlertManagement = (): UseAlertManagementReturn => {
  const [alertKey, setAlertKey] = React.useState<number>(0);
  const [uploadAlertKey, setUploadAlertKey] = React.useState<number>(0);
  const [deleteAlertKey, setDeleteAlertKey] = React.useState<number>(0);
  const [errorAlertKey, setErrorAlertKey] = React.useState<number>(0);
  const [showSuccessAlert, setShowSuccessAlert] = React.useState(false);
  const [showUploadSuccessAlert, setShowUploadSuccessAlert] = React.useState(false);
  const [showDeleteSuccessAlert, setShowDeleteSuccessAlert] = React.useState(false);
  const [showErrorAlert, setShowErrorAlert] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();

  const autoHideTimeouts = React.useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({
    success: undefined,
    upload: undefined,
    delete: undefined,
    error: undefined,
  });
  const uploadRafRef = React.useRef<number>();
  const deleteRafRef = React.useRef<number>();

  const clearTimeoutRef = (key: keyof typeof autoHideTimeouts.current) => {
    const handle = autoHideTimeouts.current[key];
    if (handle) {
      clearTimeout(handle);
      autoHideTimeouts.current[key] = undefined;
    }
  };

  const showSuccAlert = React.useCallback(() => {
    setAlertKey((key) => key + 1);
    setShowSuccessAlert(true);
    clearTimeoutRef('success');
    autoHideTimeouts.current.success = setTimeout(() => {
      setShowSuccessAlert(false);
      clearTimeoutRef('success');
    }, ALERT_TIMEOUT_MS);
  }, []);

  const showUploadSuccAlert = React.useCallback(() => {
    // Reset the alert first, then show it with a new key
    setShowUploadSuccessAlert(false);
    setUploadAlertKey((key) => key + 1);
    setAlertKey((key) => key + 1);
    // Use requestAnimationFrame to ensure the reset happens before showing
    if (uploadRafRef.current) {
      cancelAnimationFrame(uploadRafRef.current);
    }
    uploadRafRef.current = requestAnimationFrame(() => {
      setShowUploadSuccessAlert(true);
      clearTimeoutRef('upload');
      autoHideTimeouts.current.upload = setTimeout(() => {
        setShowUploadSuccessAlert(false);
        clearTimeoutRef('upload');
      }, ALERT_TIMEOUT_MS);
    });
  }, []);

  const showDeleteSuccAlert = React.useCallback(() => {
    // Reset the alert first, then show it with a new key
    setShowDeleteSuccessAlert(false);
    setDeleteAlertKey((key) => key + 1);
    setAlertKey((key) => key + 1);
    // Use requestAnimationFrame to ensure the reset happens before showing
    if (deleteRafRef.current) {
      cancelAnimationFrame(deleteRafRef.current);
    }
    deleteRafRef.current = requestAnimationFrame(() => {
      setShowDeleteSuccessAlert(true);
      clearTimeoutRef('delete');
      autoHideTimeouts.current.delete = setTimeout(() => {
        setShowDeleteSuccessAlert(false);
        clearTimeoutRef('delete');
      }, ALERT_TIMEOUT_MS);
    });
  }, []);

  const showErrAlert = React.useCallback((message?: string) => {
    setErrorAlertKey((key) => key + 1);
    setAlertKey((key) => key + 1);
    setErrorMessage(message);
    setShowErrorAlert(true);
    clearTimeoutRef('error');
    autoHideTimeouts.current.error = setTimeout(() => {
      setShowErrorAlert(false);
      setErrorMessage(undefined);
      clearTimeoutRef('error');
    }, ALERT_TIMEOUT_MS);
  }, []);

  const hideSuccessAlert = React.useCallback(() => {
    setShowSuccessAlert(false);
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

  React.useEffect(
    () => () => {
      const timeoutKeys: Array<keyof typeof autoHideTimeouts.current> = [
        'success',
        'upload',
        'delete',
        'error',
      ];
      timeoutKeys.forEach(clearTimeoutRef);
      if (uploadRafRef.current) {
        cancelAnimationFrame(uploadRafRef.current);
      }
      if (deleteRafRef.current) {
        cancelAnimationFrame(deleteRafRef.current);
      }
    },
    [],
  );

  return {
    showSuccessAlert,
    showUploadSuccessAlert,
    showDeleteSuccessAlert,
    showErrorAlert,
    alertKey,
    uploadAlertKey,
    deleteAlertKey,
    errorAlertKey,
    errorMessage,
    onShowSuccessAlert: showSuccAlert,
    onShowUploadSuccessAlert: showUploadSuccAlert,
    onShowDeleteSuccessAlert: showDeleteSuccAlert,
    onShowErrorAlert: showErrAlert,
    onHideSuccessAlert: hideSuccessAlert,
    onHideUploadSuccessAlert: hideUploadSuccessAlert,
    onHideDeleteSuccessAlert: hideDeleteSuccessAlert,
    onHideErrorAlert: hideErrorAlert,
  };
};

export default useAlertManagement;
