import type { SuiteEvaluatesOption } from '~/app/pages/const';
import type { SourceMode } from '~/app/types';

export const suiteEvaluatesToSourceMode = (evaluates: SuiteEvaluatesOption): SourceMode => {
  if (evaluates === 'model') {
    return 'model';
  }
  if (evaluates === 'agent') {
    return 'agent';
  }
  return 'agent';
};

export const getEvaluatingFieldLabel = (sourceMode: SourceMode): string => {
  switch (sourceMode) {
    case 'model':
      return 'Model';
    case 'agent':
      return 'Agent';
    case 'prerecorded':
      return 'Pre-recorded responses';
    default:
      return 'Evaluating';
  }
};
