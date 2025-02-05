import React from 'react';
import { AcceleratorProfileKind } from '~/k8sTypes';
import { ContainerResources, Toleration } from '~/types';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useGenericObjectState from './useGenericObjectState';
import useReadAcceleratorState, { AcceleratorProfileState } from './useReadAcceleratorState';

export type AcceleratorProfileFormData = {
  profile?: AcceleratorProfileKind;
  count: number;
  useExistingSettings: boolean;
};

export type UseAcceleratorProfileFormResult = {
  initialState: AcceleratorProfileState;
  formData: AcceleratorProfileFormData;
  setFormData: UpdateObjectAtPropAndValue<AcceleratorProfileFormData>;
  resetFormData: () => void;
  loaded: boolean;
  loadError: Error | undefined;
  refresh: () => Promise<AcceleratorProfileState | undefined>;
};

// TODO: Deprecate accelerator profile UI support in favor for hardware profiles. Remove in https://issues.redhat.com/browse/RHOAIENG-18070
const useAcceleratorProfileFormState = (
  resources?: ContainerResources,
  tolerations?: Toleration[],
  existingAcceleratorProfileName?: string,
): UseAcceleratorProfileFormResult => {
  const [initialState, loaded, loadError, refresh] = useReadAcceleratorState(
    resources,
    tolerations,
    existingAcceleratorProfileName,
  );

  const [formData, setFormData, resetFormData] = useGenericObjectState<AcceleratorProfileFormData>({
    profile: undefined,
    count: 0,
    useExistingSettings: false,
  });

  React.useEffect(() => {
    if (loaded) {
      setFormData('profile', initialState.acceleratorProfile);
      setFormData('count', initialState.count);
      setFormData('useExistingSettings', initialState.unknownProfileDetected);
    }
  }, [loaded, initialState, setFormData]);

  return {
    initialState,
    formData,
    setFormData,
    resetFormData,
    loaded,
    loadError,
    refresh,
  };
};

export default useAcceleratorProfileFormState;
