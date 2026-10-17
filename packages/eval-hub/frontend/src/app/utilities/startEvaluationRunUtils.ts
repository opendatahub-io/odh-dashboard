import type { SuiteEvaluatesOption } from '~/app/pages/const';
import type { Collection, FlatBenchmark, SourceMode } from '~/app/types';

export const SOURCE_OPTIONS: { value: SourceMode; label: string }[] = [
  { value: 'model', label: 'Model' },
  { value: 'agent', label: 'Agent' },
];

const PRERECORDED_SOURCE_OPTION = {
  value: 'prerecorded',
  label: 'Pre-recorded responses',
} as const;
// IBM CLEAR is currently the only evaluation provider that supports pre-recorded responses.
const IBM_CLEAR_PROVIDER_ID = 'ibm-clear';

export const getSourceOptions = (
  benchmark?: Pick<FlatBenchmark, 'providerId'>,
  collection?: Pick<Collection, 'benchmarks'>,
): { value: SourceMode; label: string }[] => {
  const collectionBenchmarks = collection?.benchmarks;
  const supportsPrerecordedResponses =
    benchmark?.providerId === IBM_CLEAR_PROVIDER_ID ||
    (collectionBenchmarks !== undefined &&
      collectionBenchmarks.length > 0 &&
      collectionBenchmarks.every(
        (collectionBenchmark) => collectionBenchmark.provider_id === IBM_CLEAR_PROVIDER_ID,
      ));

  return supportsPrerecordedResponses
    ? [...SOURCE_OPTIONS, PRERECORDED_SOURCE_OPTION]
    : SOURCE_OPTIONS;
};

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
