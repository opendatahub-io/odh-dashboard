import type { RuntimeImageInstallActionData } from '~/odh/extension-points/runtime-image-install-action';
import type { ServingRuntime, ServingRuntimeVersion } from '~/odh/types/servingRuntimeCatalogTypes';
export declare const formatRuntimeTemplate: (template: string | undefined) => string;
type BuildRuntimeImageInstallActionDataArgs = {
    runtime: ServingRuntime;
    version?: ServingRuntimeVersion;
    cancelReturnRoute: string;
    libraryReturnRoute: string;
};
export declare const buildRuntimeImageInstallActionData: ({ runtime, version, cancelReturnRoute, libraryReturnRoute, }: BuildRuntimeImageInstallActionDataArgs) => RuntimeImageInstallActionData;
export declare const formatRuntimePublishedDate: (publishedDate?: string) => string | undefined;
export {};
