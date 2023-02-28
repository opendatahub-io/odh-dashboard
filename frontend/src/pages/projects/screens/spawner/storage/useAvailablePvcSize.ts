import * as React from 'react';
import { AppContext } from '~/app/AppContext';

const DEFAULT_PVC_SIZE = 20;

const useDefaultPvcSize = (): number => {
  const {
    dashboardConfig: {
      spec: { notebookController },
    },
  } = React.useContext(AppContext);

  let defaultPvcSize = DEFAULT_PVC_SIZE;
  if (notebookController?.pvcSize) {
    const parsedConfigSize = parseInt(notebookController?.pvcSize);
    if (!isNaN(parsedConfigSize)) {
      defaultPvcSize = parsedConfigSize;
    }
  }

  return defaultPvcSize;
};

export default useDefaultPvcSize;
