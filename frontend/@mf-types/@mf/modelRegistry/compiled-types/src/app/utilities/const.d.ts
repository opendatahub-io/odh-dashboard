import { DeploymentMode } from 'mod-arch-core';
import { Theme } from 'mod-arch-kubeflow';
declare const STYLE_THEME: Theme;
declare const DEPLOYMENT_MODE: DeploymentMode;
declare const DEV_MODE: boolean;
declare const POLL_INTERVAL: number;
declare const KUBEFLOW_USERNAME: string;
declare const IMAGE_DIR: string;
declare const LOGO_LIGHT: string;
declare const MANDATORY_NAMESPACE: string | undefined;
declare const MODEL_REGISTRY_NAMESPACE: string | undefined;
declare const URL_PREFIX = "/model-registry";
declare const BFF_API_VERSION = "v1";
/** Base path for model-registry BFF REST calls (list/delete MCP deployments, etc.). */
declare const BFF_HOST_PATH = "/model-registry/api/v1";
declare const COMPANY_URI: string;
export { STYLE_THEME, POLL_INTERVAL, DEV_MODE, KUBEFLOW_USERNAME, IMAGE_DIR, LOGO_LIGHT, URL_PREFIX, DEPLOYMENT_MODE, BFF_API_VERSION, BFF_HOST_PATH, MANDATORY_NAMESPACE, MODEL_REGISTRY_NAMESPACE, COMPANY_URI, };
export declare const NamespaceSelectorMessages: {
    readonly SELECTOR_TOOLTIP: "This list includes only namespaces that you and the selected model registry have permission to access. To request access to a new or existing namespace, contact your administrator.";
    readonly TEXT_INPUT_TOOLTIP: "Enter the name of the namespace where you want to run the model transfer job. The namespace must have access to the selected model registry.";
    readonly NO_ACCESS: "You do not have access to any namespaces. To request access to a new or existing namespace, contact your administrator.";
    readonly SELECTED_NAMESPACE_NO_ACCESS: "The selected namespace does not have access to this model registry. Contact your administrator to grant access.";
};
export declare const REGISTRATION_TOAST_TITLES: {
    readonly REGISTER_AND_STORE_STARTED: "Model transfer job started";
    readonly REGISTER_AND_STORE_SUCCEEDED: "Model transfer job succeeded";
    readonly REGISTER_AND_STORE_ERROR: "Model transfer job failed";
};
export declare const FindAdministratorOptions: string[];
