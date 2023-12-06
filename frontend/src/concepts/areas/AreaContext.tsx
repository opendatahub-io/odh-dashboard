import * as React from 'react';
import { Alert, Bullseye, Spinner } from '@patternfly/react-core';
import useFetchDscStatus from '~/concepts/areas/useFetchDscStatus';
import { DataScienceClusterKindStatus } from '~/k8sTypes';

type AreaContextState = {
  /**
   * If value is `null`:
   *   Using the v1 Operator, no status to pull
   *   TODO: Remove when we no longer want to support v1
   */
  dscStatus: DataScienceClusterKindStatus | null;
};

export const AreaContext = React.createContext<AreaContextState>({
  dscStatus: null,
});

type AreaContextProps = {
  children: React.ReactNode;
};

const AreaContextProvider: React.FC<AreaContextProps> = ({ children }) => {
  const [dscStatus, loaded, error] = useFetchDscStatus();

  if (error) {
    return (
      <Alert isInline variant="danger" title="Problem loading component state">
        {error.message}
      </Alert>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return <AreaContext.Provider value={{ dscStatus }}>{children}</AreaContext.Provider>;
};

export default AreaContextProvider;
