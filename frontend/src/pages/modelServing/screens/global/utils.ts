import { InferenceServiceKind } from '../../../../k8sTypes';
import { getDisplayNameFromK8sResource } from '../../../projects/utils';

export const getInferenceServiceDisplayName = (is: InferenceServiceKind): string =>
  getDisplayNameFromK8sResource(is);

export const checkInferenceServiceReady = (is: InferenceServiceKind): boolean =>
  is.status?.conditions.find((condition) => condition.type === 'Ready')?.status === 'True';
