import * as React from 'react';
import { AppContext } from '#~/app/AppContext';

const useDefaultProbeTimeout = (): number => {
  const {
    dashboardConfig: {
      spec: { notebookController },
    },
  } = React.useContext(AppContext);

  return notebookController?.probeTimeoutSeconds ?? 5;
};

export default useDefaultProbeTimeout;
