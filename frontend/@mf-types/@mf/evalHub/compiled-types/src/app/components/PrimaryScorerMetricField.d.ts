import * as React from 'react';
type PrimaryScorerMetricFieldProps = {
    metrics: string[];
    selected: string | undefined;
    onChange: (metric: string) => void;
    fieldId?: string;
};
declare const PrimaryScorerMetricField: React.FC<PrimaryScorerMetricFieldProps>;
export default PrimaryScorerMetricField;
