/**
 * Temporary development hook for toggling incomplete features in the browser.
 *
 * This hook provides a browser storage-backed feature flag that can be toggled
 * via the browser console using:
 *     window.setTempDevCatalogHuggingFaceApiKeyFeatureAvailable(true/false);
 * The state persists across page reloads using browser storage.
 *
 * Each TempDevFeature and corresponding window.set* here should be removed once that feature is ready.
 * This entire hook should be removed once all these features are ready.
 *
 * @returns {boolean} Whether the feature is enabled
 */
declare global {
    interface Window {
        setTempDevCatalogHuggingFaceApiKeyFeatureAvailable?: (enabled: boolean) => void;
    }
}
export declare enum TempDevFeature {
    CatalogHuggingFaceApiKey = "tempDevCatalogHuggingFaceApiKeyFeatureAvailable"
}
export declare const useTempDevFeatureAvailable: (feature: TempDevFeature) => boolean;
