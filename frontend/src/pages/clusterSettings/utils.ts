import { DataScienceClusterKind } from '~/k8sTypes';
import { safeExecute } from '~/utilities/utils';

// TODO: Remove safeExecute usage in https://issues.redhat.com/browse/RHOAIENG-19825
export const isInstructLabEnabled = (dsc: DataScienceClusterKind | null): boolean =>
  safeExecute(
    () =>
      dsc?.spec.components?.datasciencepipelines?.managedPipelines.instructLab.state === 'Managed',
    false,
  );
