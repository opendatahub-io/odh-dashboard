package pipelines

// DisabledMLflowPluginInput returns the KFP plugin input that disables MLflow
// tracking for an AutoX pipeline run.
func DisabledMLflowPluginInput() map[string]map[string]any {
	return map[string]map[string]any{
		"mlflow": {
			"disabled": true,
		},
	}
}
