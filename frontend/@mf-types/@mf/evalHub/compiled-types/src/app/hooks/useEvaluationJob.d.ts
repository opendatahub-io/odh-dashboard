import { EvaluationJob } from '~/app/types';
export declare const useEvaluationJob: (namespace?: string, jobId?: string) => [EvaluationJob | null, boolean, Error | undefined];
