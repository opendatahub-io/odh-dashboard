import { InferenceServiceKind } from '../../../../k8sTypes';
import { getDisplayNameFromK8sResource } from '../../../projects/utils';

export const getInferenceServiceDisplayName = (is: InferenceServiceKind): string =>
  getDisplayNameFromK8sResource(is);
