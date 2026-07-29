import * as React from 'react';
type BenchmarkThresholdFieldProps = {
    value: number;
    onChange: (value: number) => void;
    label?: string;
    helpText?: string;
    fieldId?: string;
};
declare const BenchmarkThresholdField: React.FC<BenchmarkThresholdFieldProps>;
export default BenchmarkThresholdField;
