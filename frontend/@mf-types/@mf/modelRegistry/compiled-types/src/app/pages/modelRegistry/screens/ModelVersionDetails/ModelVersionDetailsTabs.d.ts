import * as React from 'react';
import { ModelVersion } from '~/app/types';
import { ModelVersionDetailsTab } from './const';
type ModelVersionDetailTabsProps = {
    tab: ModelVersionDetailsTab;
    modelVersion: ModelVersion;
    isArchiveVersion?: boolean;
    refresh: () => void;
    mrName?: string;
};
declare const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps>;
export default ModelVersionDetailsTabs;
