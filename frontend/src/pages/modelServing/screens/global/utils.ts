import { InferenceServiceKind } from '../../../../k8sTypes';
import { getDisplayNameFromK8sResource } from '../../../projects/utils';
import { InferenceServiceModelState } from '../types';

export const getInferenceServiceDisplayName = (is: InferenceServiceKind): string =>
  getDisplayNameFromK8sResource(is);

export const getInferenceServiceActiveModelState = (
  is: InferenceServiceKind,
): InferenceServiceModelState =>
  <InferenceServiceModelState>is.status?.modelStatus.states?.activeModelState ||
  InferenceServiceModelState.UNKNOWN;
