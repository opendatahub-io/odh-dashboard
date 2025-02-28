export declare enum Theme {
    Default = "default-theme",
    MUI = "mui-theme"
}
export declare enum DeploymentMode {
    Standalone = "standalone",
    Integrated = "integrated"
}
export declare enum PlatformMode {
    Default = "default",
    Kubeflow = "kubeflow"
}
export declare const isMUITheme: () => boolean;
export declare const isStandalone: () => boolean;
export declare const isIntegrated: () => boolean;
export declare const isPlatformKubeflow: () => boolean;
export declare const isPlatformDefault: () => boolean;
declare const PLATFORM_MODE: string;
declare const DEV_MODE: boolean;
declare const MOCK_AUTH: boolean;
declare const POLL_INTERVAL: number;
declare const AUTH_HEADER: string;
declare const USERNAME: string;
declare const IMAGE_DIR: string;
declare const LOGO_LIGHT: string;
declare const URL_PREFIX = "/model-registry";
export { POLL_INTERVAL, DEV_MODE, AUTH_HEADER, USERNAME, IMAGE_DIR, LOGO_LIGHT, MOCK_AUTH, URL_PREFIX, PLATFORM_MODE, };
export declare const FindAdministratorOptions: string[];
