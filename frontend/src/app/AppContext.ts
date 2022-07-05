import * as React from 'react';
import { BuildStatus } from '../types';

type AppContextProps = {
  isNavOpen: boolean;
  setIsNavOpen: (isNavOpen: boolean) => void;
  onNavToggle: () => void;
  buildStatuses: BuildStatus[];
};

const defaultAppContext: AppContextProps = {
  isNavOpen: true,
  setIsNavOpen: () => undefined,
  onNavToggle: () => undefined,
  buildStatuses: [],
};

const AppContext = React.createContext(defaultAppContext);

export default AppContext;
