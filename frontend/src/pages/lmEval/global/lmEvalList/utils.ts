import {
  t_global_text_color_regular as RegularColor,
  t_global_text_color_status_danger_default as DangerColor,
} from '@patternfly/react-tokens';
import { LMEvalKind } from '#~/k8sTypes.ts';
import { LMEvalState } from '#~/pages/lmEval/types';

export const getLMEvalStatusMessage = (status: LMEvalKind['status']): string => {
  if (!status?.state) {
    return 'Unknown';
  }

  if (status.state === 'Complete' && status.reason === 'Failed') {
    return status.message || 'Failed';
  }

  switch (status.state) {
    case 'Scheduled':
      return 'Pending';
    case 'Running':
      return 'Running';
    case 'Complete':
      return status.reason === 'NoReason' ? 'Complete' : status.reason || 'Complete';
    default:
      return status.state;
  }
};

export const getLMEvalState = (status: LMEvalKind['status']): LMEvalState => {
  if (!status?.state) {
    return LMEvalState.PENDING;
  }

  switch (status.state) {
    case 'Scheduled':
      return LMEvalState.PENDING;
    case 'Running':
      return LMEvalState.IN_PROGRESS;
    case 'Complete':
      return status.reason === 'Failed' ? LMEvalState.FAILED : LMEvalState.COMPLETE;
    default:
      return LMEvalState.PENDING;
  }
};

export const getLMEvalStatusProgress = (status: LMEvalKind['status']): number => {
  if (!status?.message?.includes('Requesting API:')) {
    return 0;
  }

  const match = status.message.match(/Requesting API:\s*(\d+)%/);
  return match ? Number(match[1]) : 0;
};

export const getLMEvalStatusColor = (state: LMEvalState): string =>
  state === LMEvalState.FAILED ? DangerColor.var : RegularColor.var;
