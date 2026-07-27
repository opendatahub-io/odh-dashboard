import * as React from 'react';
import { FlatBenchmark } from '~/app/types';
type BenchmarkDrawerPanelProps = {
    benchmark: FlatBenchmark | undefined;
    onClose: () => void;
    onRunBenchmark: (b: FlatBenchmark) => void;
};
declare const BenchmarkDrawerPanel: React.FC<BenchmarkDrawerPanelProps>;
export default BenchmarkDrawerPanel;
