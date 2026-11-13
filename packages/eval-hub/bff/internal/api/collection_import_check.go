package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

// buildImportCreateRequest validates the parsed document against the server's
// mandatory fields and converts it to a CreateCollectionRequest. Hard errors
// (missing mandatory fields, invalid types) block submission; advisory
// warnings are returned alongside. The server's validation on the create call
// remains authoritative — these checks are best-effort and advisory.
func buildImportCreateRequest(doc map[string]any) (evalhub.CreateCollectionRequest, []string, error) {
	var request evalhub.CreateCollectionRequest
	var warnings []string

	for _, field := range sortedKeys(doc) {
		if _, managed := serverManagedCollectionFields[field]; managed {
			warnings = append(warnings, fmt.Sprintf("field %q is managed by the server and will be ignored", field))
			delete(doc, field)
			continue
		}
		if _, known := knownCollectionImportFields[field]; !known {
			warnings = append(warnings, fmt.Sprintf("unrecognized field %q will be ignored", field))
			delete(doc, field)
		}
	}
	if description, ok := doc["description"].(string); !ok || strings.TrimSpace(description) == "" {
		warnings = append(warnings, "no description provided; consider adding one so the collection is easy to identify")
	}

	name, ok := doc["name"].(string)
	if !ok || strings.TrimSpace(name) == "" {
		return request, nil, errors.New("name is required and must be a non-empty string")
	}

	benchmarksRaw, ok := doc["benchmarks"].([]any)
	if !ok || len(benchmarksRaw) == 0 {
		return request, nil, errors.New("at least one benchmark is required")
	}
	for index, benchmarkRaw := range benchmarksRaw {
		benchmark, ok := benchmarkRaw.(map[string]any)
		if !ok {
			return request, nil, fmt.Errorf("benchmark at index %d must be an object", index)
		}
		label := fmt.Sprintf("benchmark at index %d", index)
		if id, ok := benchmark["id"].(string); ok && id != "" {
			label = fmt.Sprintf("benchmark %q", id)
		}
		for _, field := range sortedKeys(benchmark) {
			if _, managed := serverManagedBenchmarkFields[field]; managed {
				warnings = append(warnings, fmt.Sprintf("%s: field %q is managed by the server and will be ignored", label, field))
				delete(benchmark, field)
				continue
			}
			if _, known := knownBenchmarkImportFields[field]; !known {
				warnings = append(warnings, fmt.Sprintf("%s: unrecognized field %q will be ignored", label, field))
				delete(benchmark, field)
			}
		}
		if id, ok := benchmark["id"].(string); !ok || strings.TrimSpace(id) == "" {
			return request, nil, fmt.Errorf("%s: id is required", label)
		}
		if providerID, ok := benchmark["provider_id"].(string); !ok || strings.TrimSpace(providerID) == "" {
			return request, nil, fmt.Errorf("%s: provider_id is required", label)
		}
	}

	category, hasCategory := doc["category"].(string)
	domains, hasDomains := doc["domains"].([]any)
	if (!hasCategory || strings.TrimSpace(category) == "") && (!hasDomains || len(domains) == 0) {
		return request, nil, errors.New("either category or a non-empty domains list is required")
	}

	// Convert through JSON so struct field types are enforced with the
	// decoder's field-level errors; unknown fields are dropped by the struct,
	// matching the "ignored" warnings above.
	encoded, err := json.Marshal(doc)
	if err != nil {
		return request, nil, fmt.Errorf("failed to encode collection definition: %w", err)
	}
	if err := json.Unmarshal(encoded, &request); err != nil {
		var typeError *json.UnmarshalTypeError
		if errors.As(err, &typeError) && typeError.Field != "" {
			return request, nil, fmt.Errorf("field %q has an invalid value", typeError.Field)
		}
		return request, nil, fmt.Errorf("collection definition has invalid field values: %w", err)
	}

	for _, benchmark := range request.Benchmarks {
		if benchmark.Weight < 0 {
			return request, nil, fmt.Errorf("benchmark %s: weight must be non-negative", benchmark.ID)
		}
		if err := benchmark.TestDataRef.Validate(); err != nil {
			return request, nil, fmt.Errorf("benchmark %s: %w", benchmark.ID, err)
		}
	}
	// TODO: Remove this temporary mapping once the EvalHub API is deployed
	// (mirrors CreateCollectionHandler).
	if strings.TrimSpace(request.Category) == "" && len(request.Domains) > 0 {
		request.Category = strings.TrimSpace(request.Domains[0])
	}

	return request, warnings, nil
}

// translateImportError rewrites upstream errors that reveal whether a
// referenced provider or benchmark exists but is inaccessible, using uniform
// "not found or not accessible" wording so users cannot enumerate resources
// outside their visibility.
func translateImportError(err error) error {
	var ehErr *evalhub.EvalHubError
	if !errors.As(err, &ehErr) {
		return err
	}
	switch ehErr.StatusCode {
	case http.StatusBadRequest, http.StatusForbidden, http.StatusNotFound:
	default:
		return err
	}
	message := strings.ToLower(ehErr.Message)
	references := strings.Contains(message, "provider") || strings.Contains(message, "benchmark")
	status := strings.Contains(message, "not found") || strings.Contains(message, "not exist") ||
		strings.Contains(message, "forbidden") || strings.Contains(message, "permission") ||
		strings.Contains(message, "access") || strings.Contains(message, "unauthorized")
	if references && status {
		return evalhub.NewEvalHubError(ehErr.Code, "a referenced provider or benchmark is not found or not accessible", ehErr.StatusCode)
	}
	return err
}

func sortedKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
