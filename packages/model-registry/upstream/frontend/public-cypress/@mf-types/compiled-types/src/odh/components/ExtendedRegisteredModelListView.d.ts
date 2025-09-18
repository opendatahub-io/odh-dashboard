import * as React from 'react';
import { ModelVersion, RegisteredModel } from '~/app/types';
type ExtendedRegisteredModelListViewProps = {
    registeredModels: RegisteredModel[];
    modelVersions: ModelVersion[];
    refresh: () => void;
};
declare const ExtendedRegisteredModelListView: React.FC<ExtendedRegisteredModelListViewProps>;
export default ExtendedRegisteredModelListView;
