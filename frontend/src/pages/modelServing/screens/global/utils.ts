import { InferenceServiceKind, SecretKind } from '../../../../k8sTypes';
import { getDisplayNameFromK8sResource } from '../../../projects/utils';
import { InferenceServiceModelState } from '../types';

export const getInferenceServiceDisplayName = (is: InferenceServiceKind): string =>
  getDisplayNameFromK8sResource(is);

export const getTokenDisplayName = (secret: SecretKind): string =>
  getDisplayNameFromK8sResource(secret);

export const getInferenceServiceActiveModelState = (
  is: InferenceServiceKind,
): InferenceServiceModelState =>
  <InferenceServiceModelState>is.status?.modelStatus.states?.activeModelState ||
  InferenceServiceModelState.UNKNOWN;

export const getInferenceServiceErrorMessage = (is: InferenceServiceKind): string =>
  is.status?.modelStatus.lastFailureInfo?.message ||
  is.status?.modelStatus.states?.activeModelState ||
  'Unknown';
export const getInferenceServiceErrorMessageTitle = (is: InferenceServiceKind): string =>
  is.status?.modelStatus.lastFailureInfo?.reason ||
  is.status?.modelStatus.states?.activeModelState ||
  'Unknown';
