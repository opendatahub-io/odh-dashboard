import React, { createContext, useContext, useRef, ReactNode } from 'react';

export interface ClickPosition {
  x: number;
  y: number;
}

interface LineageClickContextType {
  getLastClickPosition: () => ClickPosition | null;
  setClickPosition: (position: ClickPosition | null) => void;
}

const LineageClickContext = createContext<LineageClickContextType | undefined>(undefined);

export const useLineageClick = (): LineageClickContextType => {
  const context = useContext(LineageClickContext);
  if (!context) {
    throw new Error('useLineageClick must be used within a LineageClickProvider');
  }
  return context;
};

interface LineageClickProviderProps {
  children: ReactNode;
}

export const LineageClickProvider: React.FC<LineageClickProviderProps> = ({ children }) => {
  const lastClickPositionRef = useRef<ClickPosition | null>(null);

  const value: LineageClickContextType = {
    getLastClickPosition: () => lastClickPositionRef.current,
    setClickPosition: (position) => {
      lastClickPositionRef.current = position;
    },
  };

  return <LineageClickContext.Provider value={value}>{children}</LineageClickContext.Provider>;
};
