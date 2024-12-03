import React from 'react';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { HardwareProfileKind } from '~/k8sTypes';
import { listHardwareProfiles } from '~/api';

const useHardwareProfiles = (namespace: string): FetchState<HardwareProfileKind[]> => {
  const getHardwareProfiles = React.useCallback(() => listHardwareProfiles(namespace), [namespace]);
  return useFetchState<HardwareProfileKind[]>(getHardwareProfiles, []);
};

export default useHardwareProfiles;
