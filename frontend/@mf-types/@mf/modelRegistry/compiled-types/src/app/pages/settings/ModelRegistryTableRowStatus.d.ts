import React from 'react';
import { K8sCondition } from 'mod-arch-shared';
interface ModelRegistryTableRowStatusProps {
    conditions: K8sCondition[] | undefined;
}
export declare const ModelRegistryTableRowStatus: React.FC<ModelRegistryTableRowStatusProps>;
export {};
