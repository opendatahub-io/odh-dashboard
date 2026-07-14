import * as React from 'react';
import { EvaluationJob } from '~/app/types';
type BenchmarkResultCardProps = {
    benchmarkId: string;
    benchmarkIndex?: number;
    job: EvaluationJob;
    isSelected?: boolean;
    onClick?: () => void;
};
declare const BenchmarkResultCard: React.FC<BenchmarkResultCardProps>;
export default BenchmarkResultCard;
