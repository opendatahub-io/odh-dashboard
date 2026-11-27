package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

// Warning bounds: advisory warnings embed untrusted identifiers (benchmark
// IDs, field names), so both the per-warning identifier length and the total
// warning count are capped. Without them, a benchmark with an ID near the
// 1 MiB content cap and hundreds of unknown fields would copy that ID into
// every warning, allocating gigabytes before the upstream request is made.
const (
	maxImportWarningCount     = 100
	maxImportIdentifierLength = 64
)

// truncateImportIdentifier bounds an untrusted identifier (benchmark ID,
// field name) before it is embedded in a warning or error message. The cut is
// backed off to a rune boundary so multi-byte identifiers are not split.
func truncateImportIdentifier(value string) string {
	if len(value) <= maxImportIdentifierLength {
		return value
	}
	cut := value[:maxImportIdentifierLength]
	for len(cut) > 0 && !utf8.RuneStart(cut[len(cut)-1]) {
		cut = cut[:len(cut)-1]
	}
	return cut + "..."
}

// appendImportWarning appends a warning unless the total warning count has
// reached its cap, bounding the memory a single import can spend on warnings.
func appendImportWarning(warnings []string, format string, args ...any) []string {
	if len(warnings) >= maxImportWarningCount {
		return warnings
	}
	return append(warnings, fmt.Sprintf(format, args...))
}

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
			warnings = appendImportWarning(warnings, "field %q is managed by the server and will be ignored", truncateImportIdentifier(field))
			delete(doc, field)
			continue
		}
		if _, known := knownCollectionImportFields[field]; !known {
			warnings = appendImportWarning(warnings, "unrecognized field %q will be ignored", truncateImportIdentifier(field))
			delete(doc, field)
		}
	}
	if description, ok := doc["description"].(string); !ok || strings.TrimSpace(description) == "" {
		warnings = appendImportWarning(warnings, "no description provided; consider adding one so the collection is easy to identify")
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
			label = fmt.Sprintf("benchmark %q", truncateImportIdentifier(id))
		}
		for _, field := range sortedKeys(benchmark) {
			if _, managed := serverManagedBenchmarkFields[field]; managed {
				warnings = appendImportWarning(warnings, "%s: field %q is managed by the server and will be ignored", label, truncateImportIdentifier(field))
				delete(benchmark, field)
				continue
			}
			if _, known := knownBenchmarkImportFields[field]; !known {
				warnings = appendImportWarning(warnings, "%s: unrecognized field %q will be ignored", label, truncateImportIdentifier(field))
				delete(benchmark, field)
			}
		}
		if id, ok := benchmark["id"].(string); !ok || strings.TrimSpace(id) == "" {
			return request, nil, fmt.Errorf("%s: id is required", label)
		}
		if providerID, present := benchmark["provider_id"]; present && providerID != nil {
			if _, ok := providerID.(string); !ok {
				return request, nil, fmt.Errorf("%s: provider_id must be a string", label)
			}
		}
		if err := validateImportScoringFields(benchmark, label); err != nil {
			return request, nil, err
		}
	}

	category, hasCategory := doc["category"].(string)
	domains, hasDomains := doc["domains"].([]any)
	if (!hasCategory || strings.TrimSpace(category) == "") && (!hasDomains || len(domains) == 0) {
		return request, nil, errors.New("either category or a non-empty domains list is required")
	}

	if err := validateImportScoringFields(doc, "collection"); err != nil {
		return request, nil, err
	}

	// Convert through JSON so struct field types are enforced with the
	// decoder's field-level errors; unknown fields are dropped by the struct,
	// matching the "ignored" warnings above. UseNumber keeps large integers
	// in custom metadata exact instead of degrading to float64.
	encoded, err := json.Marshal(doc)
	if err != nil {
		return request, nil, fmt.Errorf("failed to encode collection definition: %w", err)
	}
	decoder := json.NewDecoder(bytes.NewReader(encoded))
	decoder.UseNumber()
	if err := decoder.Decode(&request); err != nil {
		var typeError *json.UnmarshalTypeError
		if errors.As(err, &typeError) && typeError.Field != "" {
			return request, nil, fmt.Errorf("field %q has an invalid value", typeError.Field)
		}
		return request, nil, fmt.Errorf("collection definition has invalid field values: %w", err)
	}

	for _, benchmark := range request.Benchmarks {
		if benchmark.Weight != nil && *benchmark.Weight < 0 {
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
		// Always 404 with a uniform code so the response does not reveal
		// whether the resource exists but is inaccessible (documented in the
		// OpenAPI spec).
		return evalhub.NewEvalHubError(evalhub.ErrCodeNotFound, "a referenced provider or benchmark is not found or not accessible", http.StatusNotFound)
	}
	return err
}

// validateImportScoringFields rejects scoring blocks that are present but
// incomplete: the OpenAPI contract marks threshold (pass_criteria) and metric
// and lower_is_better (primary_score) as required, but the decoded structs use
// plain values, so a missing or null field would silently become threshold 0
// or lower_is_better false and be sent to the server as an explicit value.
// The server cannot detect the omission, so the import must reject it here.
// Explicit 0 and false remain valid.
func validateImportScoringFields(object map[string]any, label string) error {
	if criteria, present := object["pass_criteria"]; present && criteria != nil {
		criteriaMap, ok := criteria.(map[string]any)
		if !ok {
			return fmt.Errorf("%s: pass_criteria must be an object", label)
		}
		threshold, present := criteriaMap["threshold"]
		if !present || threshold == nil || !isImportNumber(threshold) {
			return fmt.Errorf("%s: pass_criteria.threshold is required and must be a number", label)
		}
	}
	if score, present := object["primary_score"]; present && score != nil {
		scoreMap, ok := score.(map[string]any)
		if !ok {
			return fmt.Errorf("%s: primary_score must be an object", label)
		}
		metric, present := scoreMap["metric"]
		if !present || metric == nil {
			return fmt.Errorf("%s: primary_score.metric is required", label)
		}
		if _, ok := metric.(string); !ok {
			return fmt.Errorf("%s: primary_score.metric must be a string", label)
		}
		lowerIsBetter, present := scoreMap["lower_is_better"]
		if !present || lowerIsBetter == nil {
			return fmt.Errorf("%s: primary_score.lower_is_better is required", label)
		}
		if _, ok := lowerIsBetter.(bool); !ok {
			return fmt.Errorf("%s: primary_score.lower_is_better must be a boolean", label)
		}
	}
	return nil
}

// isImportNumber matches the numeric types the JSON (json.Number via
// UseNumber) and YAML (int/int64/uint64/float64) parsers can produce.
func isImportNumber(value any) bool {
	switch value.(type) {
	case json.Number, int, int64, uint64, float64:
		return true
	default:
		return false
	}
}

func sortedKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
