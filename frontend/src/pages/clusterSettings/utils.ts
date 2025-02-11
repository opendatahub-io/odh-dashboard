import { DataScienceClusterKind } from '~/k8sTypes';
import { safeExecute } from '~/utilities/utils';

export const isInstructLabEnabled = (dsc: DataScienceClusterKind | null): boolean =>
  safeExecute(
    () =>
      dsc?.spec.components?.datasciencepipelines?.managedPipelines.instructLab.state === 'Managed',
    false,
  );
