import * as React from 'react';

type AppContextProps = {
  isNavOpen: boolean;
  setIsNavOpen: (isNavOpen: boolean) => void;
  onNavToggle: () => void;
};

const defaultAppContext: AppContextProps = {
  isNavOpen: true,
  setIsNavOpen: () => undefined,
  onNavToggle: () => undefined,
};

const AppContext = React.createContext(defaultAppContext);

export default AppContext;
