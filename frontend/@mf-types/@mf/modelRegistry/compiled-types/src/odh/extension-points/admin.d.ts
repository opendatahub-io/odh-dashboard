import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
/**
 * Extension point for providing a custom admin check component.
 * This allows ODH to inject its own admin check logic (e.g., using useUser hook)
 * without creating import issues in the model registry package.
 */
export type AdminCheckExtension = Extension<'model-registry.admin/check', {
    /**
     * Component that returns admin status.
     * Should render children with isAdmin prop.
     */
    component: ComponentCodeRef<{
        children: (isAdmin: boolean, loaded: boolean) => React.ReactElement;
    }>;
}>;
export declare const isAdminCheckExtension: (extension: Extension) => extension is AdminCheckExtension;
