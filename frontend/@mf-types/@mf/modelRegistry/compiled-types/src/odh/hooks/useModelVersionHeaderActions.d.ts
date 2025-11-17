import React from 'react';
import type { ModelVersion, RegisteredModel } from '~/app/types';
export declare const useModelVersionHeaderActions: (mv: ModelVersion | undefined, registeredModel?: RegisteredModel, onActionComplete?: () => void) => {
    hasExtensions: boolean;
    ActionComponent: false | React.ComponentType<{
        mv: ModelVersion;
        registeredModel?: RegisteredModel;
        onActionComplete?: () => void;
    }>;
    actionProps: {
        mv: ModelVersion | undefined;
        registeredModel: RegisteredModel | undefined;
        onActionComplete: (() => void) | undefined;
    };
};
