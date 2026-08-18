import * as React from 'react';

export type ModelsExpandContextValue = {
  modelsExpanded: boolean;
  showToggle: boolean;
  onToggle: () => void;
};

const ModelsExpandContext = React.createContext<ModelsExpandContextValue | null>(null);

export const ModelsExpandProvider: React.FC<{
  value: ModelsExpandContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <ModelsExpandContext.Provider value={value}>{children}</ModelsExpandContext.Provider>
);

export const useModelsExpand = (): ModelsExpandContextValue | null =>
  React.useContext(ModelsExpandContext);
