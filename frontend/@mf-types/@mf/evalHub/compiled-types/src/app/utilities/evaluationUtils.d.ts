import { EvaluationJob } from '~/app/types';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
export declare const getEvaluationName: (job: EvaluationJob) => string;
export declare const getJobBenchmarks: (job: EvaluationJob) => NonNullable<EvaluationJob["benchmarks"]>;
export declare const getBenchmarkName: (job: EvaluationJob, collectionNameMap?: CollectionNameMap) => string;
export declare const getAllBenchmarkNames: (job: EvaluationJob) => string[];
export declare const getBenchmarkDisplayName: (id: string) => string;
export declare const getResultScore: (job: EvaluationJob) => string;
export declare const getBenchmarkResultScore: (job: EvaluationJob, benchmarkId: string, benchmarkIndex?: number) => string;
export declare const getResultPass: (job: EvaluationJob) => boolean | null;
export declare const formatDuration: (startStr?: string, endStr?: string) => string | null;
export declare const formatDate: (dateStr?: string) => string;
/** Only completed runs can be selected for compare. */
export declare const isEvaluationJobComparable: (job: EvaluationJob) => boolean;
