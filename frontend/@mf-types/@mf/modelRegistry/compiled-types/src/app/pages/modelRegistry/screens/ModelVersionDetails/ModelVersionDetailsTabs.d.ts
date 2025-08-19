import * as React from 'react';
import { ModelVersion } from '~/app/types';
type ModelVersionDetailTabsProps = {
    tab: string;
    modelVersion: ModelVersion;
    isArchiveVersion?: boolean;
    refresh: () => void;
};
declare const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps>;
export default ModelVersionDetailsTabs;
