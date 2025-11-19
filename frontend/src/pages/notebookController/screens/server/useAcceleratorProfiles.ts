import React from 'react';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import { listAcceleratorProfiles } from '#~/api';

/* @deprecated -- only in deprecation paths (modelmesh and finetuning (in both of them)) */
const useAcceleratorProfiles = (namespace: string): FetchState<AcceleratorProfileKind[]> => {
  const getAcceleratorProfiles = React.useCallback(
    () => listAcceleratorProfiles(namespace),
    [namespace],
  );
  return useFetchState<AcceleratorProfileKind[]>(getAcceleratorProfiles, []);
};

export default useAcceleratorProfiles;
