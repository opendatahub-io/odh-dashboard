import * as React from 'react';
import { ModelVersion } from '~/app/types';
type ModelVersionsTableRowProps = {
    modelVersion: ModelVersion;
    isArchiveRow?: boolean;
    isArchiveModel?: boolean;
    hasDeployment?: boolean;
    refresh: () => void;
};
declare const ModelVersionsTableRow: React.FC<ModelVersionsTableRowProps>;
export default ModelVersionsTableRow;
