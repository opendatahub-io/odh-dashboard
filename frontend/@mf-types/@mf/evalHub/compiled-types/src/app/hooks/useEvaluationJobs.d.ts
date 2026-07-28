import { FetchStateRefreshPromise } from 'mod-arch-core';
import { EvaluationJob, ListEvaluationJobsParams } from '~/app/types';
export declare const useEvaluationJobs: (params?: ListEvaluationJobsParams, evalHubNotReady?: boolean) => [EvaluationJob[], boolean, Error | undefined, FetchStateRefreshPromise<EvaluationJob[]>];
