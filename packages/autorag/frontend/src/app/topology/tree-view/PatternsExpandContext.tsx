import * as React from 'react';

export type PatternsExpandContextValue = {
  patternsExpanded: boolean;
  showToggle: boolean;
  onToggle: () => void;
};

const PatternsExpandContext = React.createContext<PatternsExpandContextValue | null>(null);

export const PatternsExpandProvider: React.FC<{
  value: PatternsExpandContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <PatternsExpandContext.Provider value={value}>{children}</PatternsExpandContext.Provider>
);

export const usePatternsExpand = (): PatternsExpandContextValue | null =>
  React.useContext(PatternsExpandContext);
