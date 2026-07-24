package pipelines

import (
	"encoding/json"
	"testing"
)

func TestBuildPipelineNameFilter(t *testing.T) {
	t.Run("empty name returns empty string", func(t *testing.T) {
		got, err := buildPipelineNameFilter("")
		if err != nil {
			t.Fatal(err)
		}
		if got != "" {
			t.Errorf("expected empty, got %q", got)
		}
	})

	t.Run("valid name produces correct JSON structure", func(t *testing.T) {
		got, err := buildPipelineNameFilter("my-pipeline")
		if err != nil {
			t.Fatal(err)
		}

		var parsed map[string]any
		if err := json.Unmarshal([]byte(got), &parsed); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}

		predicates, ok := parsed["predicates"].([]any)
		if !ok || len(predicates) != 1 {
			t.Fatalf("expected 1 predicate, got %v", parsed["predicates"])
		}

		pred := predicates[0].(map[string]any)
		if pred["key"] != "display_name" {
			t.Errorf("key = %v, want display_name", pred["key"])
		}
		if pred["operation"] != "EQUALS" {
			t.Errorf("operation = %v, want EQUALS", pred["operation"])
		}
		if pred["string_value"] != "my-pipeline" {
			t.Errorf("string_value = %v, want my-pipeline", pred["string_value"])
		}
	})
}

func TestBuildRunFilter(t *testing.T) {
	t.Run("no version IDs includes only storage_state", func(t *testing.T) {
		got, err := buildRunFilter(nil)
		if err != nil {
			t.Fatal(err)
		}

		var parsed map[string]any
		if err := json.Unmarshal([]byte(got), &parsed); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}

		predicates := parsed["predicates"].([]any)
		if len(predicates) != 1 {
			t.Fatalf("expected 1 predicate, got %d", len(predicates))
		}

		pred := predicates[0].(map[string]any)
		if pred["key"] != "storage_state" || pred["string_value"] != "AVAILABLE" {
			t.Errorf("unexpected predicate: %v", pred)
		}
	})

	t.Run("with version IDs adds IN predicate", func(t *testing.T) {
		got, err := buildRunFilter([]string{"v1", "v2"})
		if err != nil {
			t.Fatal(err)
		}

		var parsed map[string]any
		if err := json.Unmarshal([]byte(got), &parsed); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}

		predicates := parsed["predicates"].([]any)
		if len(predicates) != 2 {
			t.Fatalf("expected 2 predicates, got %d", len(predicates))
		}

		versionPred := predicates[1].(map[string]any)
		if versionPred["key"] != "pipeline_version_id" {
			t.Errorf("key = %v, want pipeline_version_id", versionPred["key"])
		}
		if versionPred["operation"] != "IN" {
			t.Errorf("operation = %v, want IN", versionPred["operation"])
		}

		sv := versionPred["string_values"].(map[string]any)
		values := sv["values"].([]any)
		if len(values) != 2 {
			t.Errorf("expected 2 values, got %d", len(values))
		}
	})
}
