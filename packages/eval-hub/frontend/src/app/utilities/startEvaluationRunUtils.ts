import type { SuiteEvaluatesOption } from '~/app/pages/const';
import type { SourceMode } from '~/app/types';

export const SOURCE_OPTIONS: { value: SourceMode; label: string }[] = [
  { value: 'model', label: 'Model' },
  { value: 'agent', label: 'Agent' },
  { value: 'prerecorded', label: 'Pre-recorded responses' },
];

export const suiteEvaluatesToSourceMode = (
  evaluates: SuiteEvaluatesOption | SuiteEvaluatesOption[],
): SourceMode => {
  const evaluatesOptions = Array.isArray(evaluates) ? evaluates : [evaluates];
  if (evaluatesOptions.includes('model')) {
    return 'model';
  }
  if (evaluatesOptions.includes('agent')) {
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
