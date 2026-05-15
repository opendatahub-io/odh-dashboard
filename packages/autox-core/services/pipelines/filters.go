package pipelines

import (
	"encoding/json"
	"fmt"
	"log/slog"
)

// buildPipelineNameFilter builds a KFP predicate JSON filter that restricts
// ListPipelines results to pipelines whose display_name exactly matches the given name.
// Returns an empty string if name is empty, which signals the client to omit the filter.
func buildPipelineNameFilter(name string) string {
	if name == "" {
		return ""
	}

	filter := map[string]any{
		"predicates": []map[string]any{
			{
				"key":          "display_name",
				"operation":    "EQUALS",
				"string_value": name,
			},
		},
	}

	filterJSON, err := json.Marshal(filter)
	if err != nil {
		slog.Error("failed to marshal pipeline name filter", "error", err, "name", name)
		return ""
	}

	return string(filterJSON)
}

// buildRunFilter creates a KFP predicate JSON filter for listing pipeline runs.
// Always includes storage_state=AVAILABLE to exclude archived runs.
// When versionIDs are provided, scopes runs to those versions using the IN operator.
func buildRunFilter(versionIDs []string) (string, error) {
	predicates := []map[string]any{
		{
			"key":          "storage_state",
			"operation":    "EQUALS",
			"string_value": "AVAILABLE",
		},
	}

	if len(versionIDs) > 0 {
		predicates = append(predicates, map[string]any{
			"key":       "pipeline_version_id",
			"operation": "IN",
			"string_values": map[string]any{
				"values": versionIDs,
			},
		})
	}

	filter := map[string]any{
		"predicates": predicates,
	}

	filterJSON, err := json.Marshal(filter)
	if err != nil {
		return "", fmt.Errorf("failed to marshal filter: %w", err)
	}

	return string(filterJSON), nil
}
