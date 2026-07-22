// Modules -------------------------------------------------------------------->

import React from 'react';
import UIErrorModal from './UIErrorModal.tsx';
import { UIErrorAlert, UIErrorAlerts } from './UIErrorAlert.tsx';
import type { UIError, UIErrorMappings } from './types.ts';
import { isUIError } from './util.ts';

// Types ---------------------------------------------------------------------->

type UIErrorHandlerContextType = {
  showUIError: (error: UIError) => void;
  closeUIError: (messageId: string) => void;
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
  const [errors, setErrors] = React.useState<UIError[]>([]);
  const [modalError, setModalError] = React.useState<UIError | undefined>();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const showUIError = React.useCallback((error: UIError) => {
    setErrors((prev) => [...prev, error]);
  }, []);

  const closeUIError = React.useCallback((messageId: string) => {
    setErrors((prev) => prev.filter((e) => e.messageId !== messageId));
  }, []);

  const handleShowDetails = (error: UIError) => {
    setModalError(error);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalError(undefined);
  };

  const contextValue = React.useMemo<UIErrorHandlerContextType>(
    () => ({ showUIError, closeUIError }),
    [showUIError, closeUIError],
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
          {errors.map((error) => (
            <UIErrorAlert
              key={error.messageId}
              id={`${id}-UIErrorAlert-${error.messageId}`}
              uiError={error}
              uiErrorMapping={uiErrorMappings?.[error.messageId]}
              handleShowDetails={handleShowDetails}
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
      if (isUIError(error)) {
        showUIError(error);
      } else {
        elseFn();
      }
    },
    [showUIError],
  );
};

export { UIErrorHandler, useUIErrorHandler, useCatchUIError };
