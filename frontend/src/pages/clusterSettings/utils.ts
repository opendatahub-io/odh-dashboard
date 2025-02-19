import { DataScienceClusterKind } from '~/k8sTypes';
import { safeExecute } from '~/utilities/utils';

export const isInstructLabEnabled = (dsc: DataScienceClusterKind | null): boolean =>
  safeExecute(
    'Safely checking new DSC DataScienceOperator InstructLab spec field that may not exist in current operator version',
    'https://issues.redhat.com/browse/RHOAIENG-19825',
    () =>
      dsc?.spec.components?.datasciencepipelines?.managedPipelines.instructLab.state === 'Managed',
    false,
  );
