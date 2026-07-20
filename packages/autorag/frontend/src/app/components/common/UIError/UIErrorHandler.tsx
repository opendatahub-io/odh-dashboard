// Modules -------------------------------------------------------------------->

import React from 'react';
import UIErrorModal from './UIErrorModal.tsx';
import { UIErrorAlert, UIErrorAlerts } from './UIErrorAlert.tsx';
import type { UIError } from './types.ts';

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
  children?: React.ReactNode;
}
const UIErrorHandler: React.FC<UIErrorHandlerProps> = ({ id, children }) => {
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

  return (
    <UIErrorHandlerContext.Provider value={contextValue}>
      <div id={id}>
        <UIErrorModal
          id={`${id}-UIErrorModal`}
          isOpen={isModalOpen}
          uiError={modalError}
          onClose={handleCloseModal}
        />
        <UIErrorAlerts id={`${id}-UIErrorAlerts`}>
          {errors.map((error) => (
            <UIErrorAlert
              key={error.messageId}
              id={`${id}-UIErrorAlert-${error.messageId}`}
              uiError={error}
              handleShowDetails={handleShowDetails}
            />
          ))}
        </UIErrorAlerts>
        {children}
      </div>
    </UIErrorHandlerContext.Provider>
  );
};

// Public --------------------------------------------------------------------->

export { useUIErrorHandler };
export default UIErrorHandler;
