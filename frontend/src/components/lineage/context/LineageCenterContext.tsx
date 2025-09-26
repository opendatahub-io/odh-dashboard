import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface LineageCenterContextType {
  forceCenter: boolean;
  triggerCenter: () => void;
}

const LineageCenterContext = createContext<LineageCenterContextType | undefined>(undefined);

export const LineageCenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [forceCenter, setForceCenter] = useState(false);
  const triggerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerCenter = useCallback(() => {
    // Clear any existing timeout to prevent rapid triggers
    if (triggerTimeoutRef.current) {
      clearTimeout(triggerTimeoutRef.current);
    }

    setForceCenter(true);

    // Reset after a delay to allow re-triggering, with debounce
    triggerTimeoutRef.current = setTimeout(() => {
      setForceCenter(false);
      triggerTimeoutRef.current = null;
    }, 300); // Longer delay to ensure debounced centering completes
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (triggerTimeoutRef.current) {
        clearTimeout(triggerTimeoutRef.current);
        triggerTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <LineageCenterContext.Provider value={{ forceCenter, triggerCenter }}>
      {children}
    </LineageCenterContext.Provider>
  );
};

export const useLineageCenter = (): LineageCenterContextType => {
  const context = useContext(LineageCenterContext);
  if (context === undefined) {
    throw new Error('useLineageCenter must be used within a LineageCenterProvider');
  }
  return context;
};
