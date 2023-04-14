import * as React from 'react';
import { AppContext } from '~/app/AppContext';
import { NotebookContainer, NotebookSize } from '~/types';
import { getNotebookSizes } from '~/pages/notebookController/screens/server/usePreferredNotebookSize';
import { NotebookKind } from '~/k8sTypes';
import { isCpuLimitEqual, isMemoryLimitEqual } from '~/utilities/valueUnits';

const useNotebookDeploymentSize = (
  notebook?: NotebookKind,
): { size: NotebookSize | null; error: string } => {
  const { dashboardConfig } = React.useContext(AppContext);

  const container: NotebookContainer | undefined = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  );

  if (!container) {
    return { size: null, error: 'Failed to get workbench information.' };
  }

  const sizes = getNotebookSizes(dashboardConfig);
  const size = sizes.find(
    (size) =>
      isCpuLimitEqual(size.resources.limits?.cpu, container.resources?.limits?.cpu) &&
      isMemoryLimitEqual(size.resources.limits?.memory, container.resources?.limits?.memory),
  );

  if (!size) {
    return {
      size: null,
      error:
        'Workbench size is currently unavailable. Check your dashboard configuration to view size information.',
    };
  }

  return { size, error: '' };
};

export default useNotebookDeploymentSize;
