package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"

	"gopkg.in/yaml.v3"
)

// Import limits — the 1 MiB cap is the platform ceiling for ConfigMaps and
// Secrets, which is where the EvalHub server materializes collections. The
// parser bounds (nesting depth, alias count, expanded size, mapping width)
// protect this parser from pathological constructs. The browser preview does
// not duplicate these budgets; it relies on js-yaml's own protections —
// safe-load schema, duplicate-key rejection, a merge-key budget, and
// alias-by-reference resolution that does not expand — plus the same 1 MiB
// byte cap. The checks here remain authoritative on submission.
const (
	maxImportContentSize    = 1 << 20 // 1 MiB
	maxYAMLDepth            = 50
	maxYAMLAliases          = 100
	maxYAMLExpandedNodes    = 25000
	maxImportMappingEntries = 1000
	// The request envelope carries the definition as a JSON string, so JSON
	// escaping and the {"content": ...} wrapper add overhead on top of the
	// decoded content's own 1 MiB cap.
	maxImportBodySize = 4 << 20 // 4 MiB
)

// Writable collection fields per the server's CollectionConfig schema.
var knownCollectionImportFields = map[string]struct{}{
	"name": {}, "category": {}, "description": {}, "tags": {}, "custom": {},
	"pass_criteria": {}, "benchmarks": {}, "domains": {}, "tasks": {},
	"modalities": {}, "industries": {}, "evaluation_targets": {},
}

// Collection fields the server sets itself (or rejects writes for); they are
// dropped from the create payload and reported as ignored.
var serverManagedCollectionFields = map[string]struct{}{
	"id": {}, "curation_order": {}, "derived_from": {}, "pinned_order": {},
	"resource": {}, "status": {}, "url": {},
}

// Writable benchmark fields per the server's CollectionBenchmarkConfig schema.
var knownBenchmarkImportFields = map[string]struct{}{
	"id": {}, "provider_id": {}, "weight": {}, "primary_score": {},
	"pass_criteria": {}, "parameters": {}, "test_data_ref": {},
}

// Benchmark fields the server derives from the provider definition.
var serverManagedBenchmarkFields = map[string]struct{}{
	"url": {},
}

// parseImportContent parses raw collection-definition file content, which may
// be YAML or JSON, into a generic document. JSON is detected by a leading '{'
// or '['. Content that leads with a brace but fails strict JSON parsing falls
// back to the YAML parser, so YAML flow mappings with unquoted keys
// ({name: x}) are recovered; valid JSON never falls through, keeping the
// strict JSON path's exact large-integer handling. YAML is parsed with
// safe-load semantics: custom tags are rejected, nesting depth is bounded,
// and alias expansion is capped. Only the first document of a multi-document
// YAML file is imported, with a warning.
func parseImportContent(content string) (doc map[string]any, warnings []string, err error) {
	if len(content) > maxImportContentSize {
		return nil, nil, errors.New("file exceeds the 1 MiB size limit")
	}
	if strings.TrimSpace(content) == "" {
		return nil, nil, errors.New("no collection definition found in file")
	}

	trimmed := strings.TrimLeft(content, " \t\r\n")
	if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
		doc, err = parseImportJSON(content)
		if err == nil {
			return doc, nil, nil
		}
		flowDoc, flowWarnings, flowErr := parseImportYAML(content)
		if flowErr == nil {
			return flowDoc, flowWarnings, nil
		}
		// Neither parser accepted the content; the JSON error is the more
		// familiar message for brace-leading input.
		return nil, nil, err
	}

	doc, warnings, err = parseImportYAML(content)
	return doc, warnings, err
}

func parseImportJSON(content string) (map[string]any, error) {
	decoder := json.NewDecoder(strings.NewReader(content))
	// UseNumber keeps large integers exact through the later
	// marshal/unmarshal round-trip into CreateCollectionRequest.
	decoder.UseNumber()
	var value any
	if err := decoder.Decode(&value); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		return nil, errors.New("invalid JSON: unexpected content after the document")
	}
	if err := validateImportJSONValue(value, 0); err != nil {
		return nil, err
	}
	return asImportObject(value)
}

// validateImportJSONValue enforces on the JSON path the same nesting-depth
// and mapping-width bounds that validateImportYAMLNode enforces on the YAML
// path, so both formats reject the same pathological shapes.
func validateImportJSONValue(value any, depth int) error {
	if depth > maxYAMLDepth {
		return fmt.Errorf("JSON nesting exceeds %d levels", maxYAMLDepth)
	}
	switch typed := value.(type) {
	case map[string]any:
		if len(typed) > maxImportMappingEntries {
			return fmt.Errorf("JSON mapping exceeds the %d-entry limit", maxImportMappingEntries)
		}
		for _, child := range typed {
			if err := validateImportJSONValue(child, depth+1); err != nil {
				return err
			}
		}
	case []any:
		for _, child := range typed {
			if err := validateImportJSONValue(child, depth+1); err != nil {
				return err
			}
		}
	}
	return nil
}

func parseImportYAML(content string) (map[string]any, []string, error) {
	decoder := yaml.NewDecoder(strings.NewReader(content))

	var first yaml.Node
	if err := decoder.Decode(&first); err != nil {
		if errors.Is(err, io.EOF) {
			return nil, nil, errors.New("no collection definition found in file")
		}
		return nil, nil, fmt.Errorf("invalid YAML: %w", err)
	}

	// Count remaining documents; only the first is imported (MVP scope).
	documents := 1
	for {
		var extra yaml.Node
		if err := decoder.Decode(&extra); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return nil, nil, fmt.Errorf("invalid YAML: %w", err)
		}
		documents++
	}
	var warnings []string
	if documents > 1 {
		warnings = append(warnings, fmt.Sprintf("file contains %d collection definitions; only the first was imported and the rest were ignored", documents))
	}

	if err := validateImportYAMLNode(&first, 0, &importYAMLBudget{}, false); err != nil {
		return nil, nil, err
	}

	var value any
	if err := first.Decode(&value); err != nil {
		return nil, nil, fmt.Errorf("invalid YAML: %w", err)
	}
	if value == nil {
		return nil, nil, errors.New("no collection definition found in file")
	}
	doc, err := asImportObject(value)
	if err != nil {
		return nil, nil, err
	}
	return doc, warnings, nil
}

// asImportObject asserts that the parsed document is an object with string
// field names.
func asImportObject(value any) (map[string]any, error) {
	switch typed := value.(type) {
	case map[string]any:
		return typed, nil
	case map[any]any:
		return nil, errors.New("collection definition must use string field names")
	default:
		return nil, errors.New("collection definition must be an object")
	}
}

// yaml.v3 built-in tags in the YAML namespace; anything else — including
// unrecognized "!!" tags — is treated as a custom tag and rejected.
var allowedYAMLTags = map[string]struct{}{
	"!!map": {}, "!!seq": {}, "!!str": {}, "!!int": {}, "!!float": {},
	"!!bool": {}, "!!null": {}, "!!timestamp": {}, "!!binary": {}, "!!merge": {},
}

// importYAMLBudget tracks alias-expansion cost while the node tree is
// validated: alias occurrences, nodes reached through alias expansion, and
// scalar bytes counted with expansion multiplicity.
type importYAMLBudget struct {
	aliases  int
	expanded int
	bytes    int
}

// validateImportYAMLNode walks the node tree before decoding, rejecting
// custom tags (safe-load semantics), nesting deeper than maxYAMLDepth levels,
// more than maxYAMLAliases alias occurrences, mappings wider than
// maxImportMappingEntries entries, and alias expansion that would produce
// more than maxYAMLExpandedNodes nodes or more than maxImportContentSize
// scalar bytes. Alias targets are followed so nested anchors cannot amplify
// a small document into a large decoded value; yaml.v3's decoder only limits
// the ratio of alias-driven decodes to total decodes, which padding nodes can
// raise. Walking the node tree rather than the decoded value catches these
// before alias expansion can allocate or before yaml.v3's duplicate-key
// comparison (quadratic in mapping width) can run.
func validateImportYAMLNode(node *yaml.Node, depth int, budget *importYAMLBudget, inAlias bool) error {
	if node == nil {
		return nil
	}
	if node.Tag != "" {
		if _, allowed := allowedYAMLTags[node.Tag]; !allowed {
			return fmt.Errorf("YAML custom tags are not allowed (found %q at line %d)", node.Tag, node.Line)
		}
	}
	if node.Kind == yaml.AliasNode {
		budget.aliases++
		if budget.aliases > maxYAMLAliases {
			return fmt.Errorf("YAML documents may not use more than %d aliases", maxYAMLAliases)
		}
		return validateImportYAMLNode(node.Alias, depth+1, budget, true)
	}
	if inAlias {
		budget.expanded++
		if budget.expanded > maxYAMLExpandedNodes {
			return fmt.Errorf("YAML alias expansion exceeds %d nodes", maxYAMLExpandedNodes)
		}
	}
	if node.Kind == yaml.ScalarNode {
		budget.bytes += len(node.Value)
		if budget.bytes > maxImportContentSize {
			return errors.New("YAML alias expansion exceeds the 1 MiB size limit")
		}
	}
	if depth > maxYAMLDepth {
		return fmt.Errorf("YAML nesting exceeds %d levels", maxYAMLDepth)
	}
	if node.Kind == yaml.MappingNode && len(node.Content)/2 > maxImportMappingEntries {
		return fmt.Errorf("YAML mapping at line %d exceeds the %d-entry limit", node.Line, maxImportMappingEntries)
	}
	for _, child := range node.Content {
		if err := validateImportYAMLNode(child, depth+1, budget, inAlias); err != nil {
			return err
		}
	}
	return nil
}
