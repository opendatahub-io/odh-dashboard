import * as React from 'react';
import { ModelVersion, RegisteredModel } from '~/app/types';
type ExtendedRegisteredModelTableRowProps = {
    registeredModel: RegisteredModel;
    latestModelVersion: ModelVersion | undefined;
    isArchiveRow?: boolean;
    hasDeploys?: boolean;
    refresh: () => void;
};
declare const ExtendedRegisteredModelTableRow: React.FC<ExtendedRegisteredModelTableRowProps>;
export default ExtendedRegisteredModelTableRow;
