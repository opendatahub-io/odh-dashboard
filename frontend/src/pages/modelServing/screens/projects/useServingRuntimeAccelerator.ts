import React, { useRef } from 'react';
import { ServingRuntimeKind } from '~/k8sTypes';
import useAccelerators from '~/pages/notebookController/screens/server/useAccelerators';
import { AcceleratorState } from '~/pages/projects/screens/detail/notebooks/useNotebookAccelerator';
import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';

const useServingRuntimeAccelerator = (
  servingRuntime?: ServingRuntimeKind,
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
      servingRuntime &&
      servingRuntime?.metadata?.annotations?.['opendatahub.io/accelerator-name'] &&
      !hasSet.current
    ) {
      const name = servingRuntime.metadata.annotations['opendatahub.io/accelerator-name'];
      const accelerator = accelerators.find((accelerator) => accelerator.metadata.name === name);
      const container = servingRuntime?.spec.containers[0];

      if (accelerator && container) {
        hasSet.current = true;
        setData('accelerator', accelerator);
        setData('count', Number(container.resources?.limits?.[accelerator.spec.identifier]) ?? 0);
      }
    }
  }, [accelerators, loaded, loadError, servingRuntime, setData]);

  return [acceleratorState, setData, resetData];
};

export default useServingRuntimeAccelerator;
