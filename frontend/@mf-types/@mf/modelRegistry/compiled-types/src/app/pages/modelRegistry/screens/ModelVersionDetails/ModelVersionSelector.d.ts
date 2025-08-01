import * as React from 'react';
import { ModelVersion } from '~/app/types';
type ModelVersionSelectorProps = {
    rmId?: string;
    selection: ModelVersion;
    onSelect: (versionId: string) => void;
};
declare const ModelVersionSelector: React.FC<ModelVersionSelectorProps>;
export default ModelVersionSelector;
