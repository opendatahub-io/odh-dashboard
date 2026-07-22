import React from 'react';

type LineagePageType = 'overview' | 'detail';

const LineagePageContext = React.createContext<LineagePageType>('overview');

export const useLineagePageType = (): LineagePageType => React.useContext(LineagePageContext);

export const LineagePageProvider: React.FC<{
  pageType: LineagePageType;
  children: React.ReactNode;
}> = ({ pageType, children }) => (
  <LineagePageContext.Provider value={pageType}>{children}</LineagePageContext.Provider>
);
