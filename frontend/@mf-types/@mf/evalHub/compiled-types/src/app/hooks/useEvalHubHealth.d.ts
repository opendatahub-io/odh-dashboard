type EvalHubHealthResult = {
    isHealthy: boolean;
    loaded: boolean;
    error: Error | undefined;
};
declare const useEvalHubHealth: (namespace?: string) => EvalHubHealthResult;
export default useEvalHubHealth;
