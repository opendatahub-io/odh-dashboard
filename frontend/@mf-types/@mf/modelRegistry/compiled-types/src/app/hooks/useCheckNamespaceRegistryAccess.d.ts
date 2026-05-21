export type UseCheckNamespaceRegistryAccessResult = {
    hasAccess: boolean | undefined;
    isLoading: boolean;
    error: Error | undefined;
    cannotCheck: boolean;
};
/**
 * Checks if the selected namespace's default ServiceAccount has access to the model registry
 * (for register-and-store job validation). Runs when jobNamespace, registryName, and
 * registryNamespace are all defined.
 */
export declare const useCheckNamespaceRegistryAccess: (registryName: string | undefined, registryNamespace: string | undefined, jobNamespace: string | undefined) => UseCheckNamespaceRegistryAccessResult;
