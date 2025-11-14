import * as React from 'react';
import { ModelVersion, RegisteredModel } from '~/app/types';
type RegisteredModelTableRowProps = {
    registeredModel: RegisteredModel;
    latestModelVersion: ModelVersion | undefined;
    isArchiveRow?: boolean;
    hasDeploys?: boolean;
    loaded?: boolean;
    refresh: () => void;
};
declare const RegisteredModelTableRow: React.FC<RegisteredModelTableRowProps>;
export default RegisteredModelTableRow;
