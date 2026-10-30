import type { SourceMode } from '~/app/types';

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
