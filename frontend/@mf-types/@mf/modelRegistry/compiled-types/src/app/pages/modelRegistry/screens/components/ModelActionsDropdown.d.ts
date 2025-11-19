import * as React from 'react';
import { MenuToggleElement } from '@patternfly/react-core';
import { ModelVersion, RegisteredModel } from '~/app/types';
interface ModelActionsDropdownProps {
    registeredModel: RegisteredModel;
    latestModelVersion?: ModelVersion;
    isArchiveRow?: boolean;
    onArchive: () => void;
    onRestore?: () => void;
    viewModelInformationActions: Array<{
        title: string;
        onClick: () => void;
    }>;
    isKebabStyle?: boolean;
    hasDeployments?: boolean;
    children?: (toggle: (toggleRef: React.Ref<MenuToggleElement>) => React.ReactElement) => React.ReactElement;
}
declare const ModelActionsDropdown: React.FC<ModelActionsDropdownProps>;
export default ModelActionsDropdown;
