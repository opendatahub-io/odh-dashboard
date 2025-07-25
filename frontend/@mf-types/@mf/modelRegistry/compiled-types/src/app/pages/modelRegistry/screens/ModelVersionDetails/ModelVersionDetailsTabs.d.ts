import * as React from 'react';
import { FetchStateObject, InferenceServiceKind, ServingRuntimeKind } from 'mod-arch-shared';
import { ModelVersion } from '~/app/types';
import { ModelVersionDetailsTab } from './const';
type ModelVersionDetailTabsProps = {
    tab: ModelVersionDetailsTab;
    modelVersion: ModelVersion;
    inferenceServices: FetchStateObject<InferenceServiceKind[]>;
    servingRuntimes: FetchStateObject<ServingRuntimeKind[]>;
    isArchiveVersion?: boolean;
    refresh: () => void;
};
declare const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps>;
export default ModelVersionDetailsTabs;
