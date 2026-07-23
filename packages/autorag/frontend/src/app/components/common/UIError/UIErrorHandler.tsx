// Modules -------------------------------------------------------------------->

import React from 'react';
import UIErrorModal from './UIErrorModal.tsx';
import { UIErrorAlert, UIErrorAlerts } from './UIErrorAlert.tsx';
import type { UIError, UIErrorMappings } from './types.ts';
import { normalizeErrorWithInstance } from './util.ts';
import { UIErrorInstance } from './UIErrorInstance.ts';

// Types ---------------------------------------------------------------------->

type UIErrorHandlerContextType = {
  showUIError: (error: UIError) => void;
  closeUIError: (error: UIErrorInstance) => void;
  showDetails: (error: UIErrorInstance) => void;
};

// Context -------------------------------------------------------------------->

const UIErrorHandlerContext = React.createContext<UIErrorHandlerContextType | undefined>(undefined);

const useUIErrorHandler = (): UIErrorHandlerContextType => {
  const ctx = React.useContext(UIErrorHandlerContext);
  if (!ctx) {
    throw new Error('useUIErrorHandler must be used within a UIErrorHandlerProvider');
  }
  return ctx;
};

// Components ----------------------------------------------------------------->

interface UIErrorHandlerProps {
  id: string;
  uiErrorMappings?: UIErrorMappings;
  children?: React.ReactNode;
}
const UIErrorHandler: React.FC<UIErrorHandlerProps> = ({ id, uiErrorMappings, children }) => {
  const [errors, setErrors] = React.useState<Record<string, UIErrorInstance>>({});
  const [modalError, setModalError] = React.useState<UIErrorInstance | undefined>();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const showUIError = React.useCallback((error: UIError) => {
    const instance = normalizeErrorWithInstance(error);
    if (instance) {
      setErrors((prev) => ({ ...prev, [instance.id]: instance }));
    }
  }, []);

  const closeUIError = React.useCallback((error: UIErrorInstance) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[error.id];
      return next;
    });
  }, []);

  const showDetails = React.useCallback((error: UIErrorInstance) => {
    setModalError(error);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalError(undefined);
  };

  const contextValue = React.useMemo<UIErrorHandlerContextType>(
    () => ({ showUIError, closeUIError, showDetails }),
    [showUIError, closeUIError, showDetails],
  );

  const modalErrorMapping = modalError && uiErrorMappings?.[modalError.messageId];

  return (
    <UIErrorHandlerContext.Provider value={contextValue}>
      <div id={id}>
        <UIErrorModal
          id={`${id}-UIErrorModal`}
          isOpen={isModalOpen}
          uiError={modalError}
          uiErrorMapping={modalErrorMapping}
          onClose={handleCloseModal}
        />
        <UIErrorAlerts id={`${id}-UIErrorAlerts`}>
          {Object.values(errors).map((error) => (
            <UIErrorAlert
              key={error.id}
              id={`${id}-UIErrorAlert-${error.id}`}
              uiError={error}
              uiErrorMapping={uiErrorMappings?.[error.messageId]}
            />
          ))}
        </UIErrorAlerts>
      </div>
      {children}
    </UIErrorHandlerContext.Provider>
  );
};

// Public --------------------------------------------------------------------->

const useCatchUIError = (): ((error: unknown, elseFn: () => void) => void) => {
  const { showUIError } = useUIErrorHandler();

  return React.useCallback(
    (error: unknown, elseFn: () => void) => {
      const instance = normalizeErrorWithInstance(error);
      if (instance) {
        showUIError(instance);
      } else {
        elseFn();
      }
    },
    [showUIError],
  );
};

export { UIErrorHandler, useUIErrorHandler, useCatchUIError };
