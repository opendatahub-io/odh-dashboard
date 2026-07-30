import * as React from 'react';
import { EvaluationJob } from '~/app/types';
type BenchmarkResultDetailsProps = {
    benchmarkId: string;
    benchmarkIndex: number;
    job: EvaluationJob;
};
declare const BenchmarkResultDetails: React.FC<BenchmarkResultDetailsProps>;
export default BenchmarkResultDetails;
