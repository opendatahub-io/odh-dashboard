import * as React from 'react';
interface MlflowCompareRunsProps {
    experimentIds: string[];
    runUuids: string[];
    workspace?: string;
}
declare const MlflowCompareRuns: React.FC<MlflowCompareRunsProps>;
export default MlflowCompareRuns;
