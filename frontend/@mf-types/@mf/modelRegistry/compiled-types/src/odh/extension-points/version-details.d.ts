import { Extension } from "@openshift/dynamic-plugin-sdk";
import { ModelVersion } from "~/app/types";
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core/extension-points';
export type ModelRegistryDeploymentsTabExtension = Extension<'model-registry.version-details/tab', {
    id: string;
    title: string;
    component: ComponentCodeRef<{
        mv: ModelVersion;
    }>;
}>;
export declare const isModelRegistryDeploymentsTabExtension: (extension: Extension) => extension is ModelRegistryDeploymentsTabExtension;
