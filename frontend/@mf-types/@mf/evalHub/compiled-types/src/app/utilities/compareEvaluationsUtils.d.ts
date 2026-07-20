import { EvaluationJob } from '~/app/types';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
export type BenchmarkSelection = {
    jobId: string;
    benchmarkId: string;
    benchmarkIndex: number | undefined;
};
export type ComparableRun = {
    experimentId: string;
    runUuid: string;
    benchmarkId: string;
    benchmarkIndex: number;
};
export type ComparableRunWithJobId = ComparableRun & {
    jobId: string;
};
export declare const parseCsvParam: (raw: string) => string[];
export declare const buildBenchmarkSelectionKey: ({ jobId, benchmarkId, benchmarkIndex, }: BenchmarkSelection) => string;
export declare const parseBenchmarkSelectionKey: (key: string) => BenchmarkSelection | null;
export declare const serializeMlflowArrayParam: (values: string[]) => string;
export declare const parseMlflowArrayParam: (raw: string | null) => string[];
export declare const getComparableRunsForJob: (job: EvaluationJob) => ComparableRun[];
export declare const isBenchmarkSuiteRun: (job: EvaluationJob) => boolean;
export type CompareRunType = 'Single benchmark' | 'Benchmark suite';
export declare const COMPARE_RUNS_PAGE_TITLE = "Compare runs";
export declare const COMPARE_CHILD_RUN_TYPE = "Benchmark run";
export declare const getCompareRunType: (job: EvaluationJob) => CompareRunType;
/** Evaluation run column for parent rows. */
export declare const getCompareParentEvaluationRunLabel: (job: EvaluationJob) => string;
export declare const getCompareParentResultScore: (job: EvaluationJob) => string;
export declare const getCompareBenchmarkResultScore: (job: EvaluationJob, benchmarkId: string, benchmarkIndex: number) => string;
export declare const getCompareRunEvaluationLabel: (job: EvaluationJob, collectionNameMap?: CollectionNameMap) => string;
export { formatDate as formatCompareTableDate } from '~/app/utilities/evaluationUtils';
export declare const getSelectionKeysCheckedState: (selectionKeys: string[], selectedBenchmarkKeys: Set<string>) => boolean | null;
export declare const getBenchmarkSelectionsFromKeys: (selectedBenchmarkKeys: Set<string>) => BenchmarkSelection[];
export declare const resolveComparableRunsFromSelections: (jobs: EvaluationJob[], selections: BenchmarkSelection[]) => ComparableRunWithJobId[];
export declare const buildDefaultComparableRunsFromJobs: (jobs: EvaluationJob[]) => ComparableRunWithJobId[];
export declare const buildMlflowCompareSearchParams: (runs: ComparableRunWithJobId[], resolveRunName: (run: ComparableRunWithJobId) => string) => string;
export declare const jobMatchesCompareBenchmarkSearch: (job: EvaluationJob, searchText: string) => boolean;
export declare const filterComparableRunsForCompareBenchmarkSearch: (job: EvaluationJob, searchText: string) => ComparableRun[];
export declare const filterJobsForCompareBenchmarkSearch: (jobs: EvaluationJob[], searchText: string) => EvaluationJob[];
