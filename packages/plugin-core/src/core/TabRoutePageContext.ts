import { createContext, useContext } from 'react';

export type TabRoutePageContextType = {
  /** Whether this content is rendered inside a TabRoutePage. */
  isInsideTabPage: boolean;
};

export const TabRoutePageContext = createContext<TabRoutePageContextType | undefined>(undefined);

export const useTabRoutePageContext = (): TabRoutePageContextType | undefined =>
  useContext(TabRoutePageContext);
