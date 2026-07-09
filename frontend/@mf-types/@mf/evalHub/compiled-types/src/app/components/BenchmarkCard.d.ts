import * as React from 'react';
import { FlatBenchmark } from '~/app/types';
type BenchmarkCardProps = {
    benchmark: FlatBenchmark;
    isSelected: boolean;
    onSelect: () => void;
    onRunBenchmark: () => void;
};
declare const BenchmarkCard: React.FC<BenchmarkCardProps>;
export default BenchmarkCard;
