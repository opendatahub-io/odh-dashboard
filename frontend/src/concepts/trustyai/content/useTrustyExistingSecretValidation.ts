import * as React from 'react';
import { UseTrustyInstallModalDataExisting } from '~/concepts/trustyai/content/useTrustyInstallModalData';

type UseTrustyExistingSecretValidation = {
  onBlur: () => void;
};

const useTrustyExistingSecretValidation = (
  formData: UseTrustyInstallModalDataExisting,
): UseTrustyExistingSecretValidation => {
  const { data, onCheckState } = formData;

  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const clearCheckTimeout = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  React.useEffect(() => {
    if (data) {
      timeoutRef.current = setTimeout(onCheckState, 3000);
    }

    return clearCheckTimeout;
  }, [clearCheckTimeout, data, onCheckState]);

  return {
    onBlur: React.useCallback(() => {
      clearCheckTimeout();
      onCheckState();
    }, [clearCheckTimeout, onCheckState]),
  };
};

export default useTrustyExistingSecretValidation;
