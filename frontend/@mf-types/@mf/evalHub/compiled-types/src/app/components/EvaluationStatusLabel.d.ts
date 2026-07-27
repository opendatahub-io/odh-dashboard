import * as React from 'react';
import { EvaluationJobState } from '~/app/types';
type EvaluationStatusLabelProps = {
    state: EvaluationJobState;
    message?: string;
};
declare const EvaluationStatusLabel: React.FC<EvaluationStatusLabelProps>;
export default EvaluationStatusLabel;
