import React from 'react';
import { AreaContext, type AreaContextState } from '@odh-dashboard/plugin-core/areas';

/** Static portal area state: no DSC/DSCI; all areas unavailable via useIsAreaAvailable fallback. */
const portalAreaContext: AreaContextState = {
  dscStatus: null,
  dsciStatus: null,
  areasStatus: {},
};

type PortalAreaContextProviderProps = {
  children: React.ReactNode;
};

const PortalAreaContextProvider: React.FC<PortalAreaContextProviderProps> = ({ children }) => (
  <AreaContext.Provider value={portalAreaContext}>{children}</AreaContext.Provider>
);

export default PortalAreaContextProvider;
