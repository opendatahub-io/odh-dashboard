import React from 'react';
import { ModelVersion, RegisteredModel } from '~/app/types';
type BaseLabTuneActionProps = {
    mv: ModelVersion;
    registeredModel?: RegisteredModel;
    onActionComplete?: () => void;
};
declare const LabTuneAction: React.FC<BaseLabTuneActionProps>;
export default LabTuneAction;
