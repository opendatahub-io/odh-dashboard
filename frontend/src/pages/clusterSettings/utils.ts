import { DataScienceClusterKind } from '~/k8sTypes';

export const isInstructLabEnabled = (dsc: DataScienceClusterKind | null): boolean =>
  dsc?.spec.components?.datasciencepipelines?.managedPipelines.instructLab.state === 'Managed';
