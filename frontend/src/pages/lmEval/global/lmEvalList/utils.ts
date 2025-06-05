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
      return LMEvalState.RUNNING;
    case 'Complete':
      return status.reason === 'Failed' ? LMEvalState.FAILED : LMEvalState.COMPLETE;
    default:
      return LMEvalState.PENDING;
  }
};
