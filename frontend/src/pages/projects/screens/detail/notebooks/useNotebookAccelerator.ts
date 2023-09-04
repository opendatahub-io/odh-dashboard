import React, { useRef } from 'react';
import { AcceleratorKind, NotebookKind } from '~/k8sTypes';
import useAccelerators from '~/pages/notebookController/screens/server/useAccelerators';
import { Notebook, PodContainer } from '~/types';
import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';

export type AcceleratorState = {
  accelerator?: AcceleratorKind;
  count: number;
};

const useNotebookAccelerator = (
  notebook?: NotebookKind | Notebook | null,
): GenericObjectState<AcceleratorState> => {
  const [acceleratorState, setData, resetData] = useGenericObjectState<AcceleratorState>({
    accelerator: undefined,
    count: 0,
  });

  const hasSet = useRef(false);

  const [accelerators, loaded, loadError] = useAccelerators();

  React.useEffect(() => {
    if (
      loaded &&
      !loadError &&
      notebook &&
      notebook?.metadata?.annotations?.['opendatahub.io/accelerator-name'] &&
      !hasSet.current
    ) {
      notebook.spec.template;
      const name = notebook.metadata.annotations['opendatahub.io/accelerator-name'];
      const accelerator = accelerators.find((accelerator) => accelerator.metadata.name === name);
      const container: PodContainer | undefined = notebook?.spec.template.spec.containers.find(
        (container) => container.name === notebook.metadata.name,
      );
      if (accelerator && container) {
        hasSet.current = true;
        setData('accelerator', accelerator);
        setData('count', Number(container.resources?.limits?.[accelerator.spec.identifier] ?? 0));
      }
    }
  }, [accelerators, loaded, loadError, notebook, setData]);

  return [acceleratorState, setData, resetData];
};

export default useNotebookAccelerator;
