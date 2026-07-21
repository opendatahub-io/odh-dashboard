export declare enum BenchmarkFilterOptions {
    category = "Category",
    name = "Name",
    metrics = "Metrics"
}
export declare const benchmarkFilterConfig: Record<BenchmarkFilterOptions, string>;
export type BenchmarkFilterDataType = Record<BenchmarkFilterOptions, string | undefined>;
export declare const initialBenchmarkFilterData: BenchmarkFilterDataType;
