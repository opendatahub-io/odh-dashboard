import * as React from 'react';
import { AppContext } from '#~/app/AppContext';
import { PodContainer, NotebookSize } from '#~/types';
import { getNotebookSizes } from '#~/pages/notebookController/screens/server/usePreferredNotebookSize';
import { NotebookKind } from '#~/k8sTypes';
import { isCpuResourceEqual, isMemoryResourceEqual } from '#~/utilities/valueUnits';

const useNotebookDeploymentSize = (notebook?: NotebookKind): { size: NotebookSize | null } => {
  const { dashboardConfig } = React.useContext(AppContext);

  const container: PodContainer | undefined = notebook?.spec.template.spec.containers.find(
    (currentContainer) => currentContainer.name === notebook.metadata.name,
  );

  if (!container) {
    return { size: null };
  }

  const sizes = getNotebookSizes(dashboardConfig);
  const size = sizes.find(
    (currentSize) =>
      isCpuResourceEqual(currentSize.resources.limits?.cpu, container.resources?.limits?.cpu) &&
      isMemoryResourceEqual(
        currentSize.resources.limits?.memory,
        container.resources?.limits?.memory,
      ) &&
      isCpuResourceEqual(currentSize.resources.requests?.cpu, container.resources?.requests?.cpu) &&
      isMemoryResourceEqual(
        currentSize.resources.requests?.memory,
        container.resources?.requests?.memory,
      ),
  );

  if (!size) {
    return {
      size: null,
    };
  }

  return { size };
};

export default useNotebookDeploymentSize;
