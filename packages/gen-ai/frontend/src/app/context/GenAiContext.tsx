import * as React from 'react';
import { BrowserStorageContextProvider } from 'mod-arch-core';
import { ProjectContextProvider } from './ProjectContext';
import { MCPContextProvider } from './MCPContext';
import { UserContextProvider } from './UserContext';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GenAiContextType {}

export const GenAiContext = React.createContext<GenAiContextType | null>(null);

interface GenAiContextProviderProps {
  children: React.ReactNode;
}

export const GenAiContextProvider: React.FC<GenAiContextProviderProps> = ({ children }) => {
  const contextValue = React.useMemo((): GenAiContextType => ({}), []);

  return (
    <GenAiContext.Provider value={contextValue}>
      <BrowserStorageContextProvider>
        <ProjectContextProvider>
          <UserContextProvider>
            <MCPContextProvider>{children}</MCPContextProvider>
          </UserContextProvider>
        </ProjectContextProvider>
      </BrowserStorageContextProvider>
    </GenAiContext.Provider>
  );
};

export { useProject as useGenAiProjects } from './ProjectContext';
