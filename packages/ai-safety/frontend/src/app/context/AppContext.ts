import * as React from 'react';
import { UserSettings, ConfigSettings } from 'mod-arch-core';

type AppContextProps = {
  config: ConfigSettings;
  user: UserSettings;
};

export const AppContext = React.createContext<AppContextProps | null>(null);

export const useAppContext = (): AppContextProps => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContext.Provider');
  }
  return context;
};
