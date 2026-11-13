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
// YAML bounds (nesting depth, alias count) protect the parser from
// pathological constructs; the browser enforces the same limits client-side.
const (
	maxImportContentSize = 1 << 20 // 1 MiB
	maxYAMLDepth         = 50
	maxYAMLAliases       = 100
)

// Writable collection fields per the server's CollectionConfig schema.
var knownCollectionImportFields = map[string]struct{}{
	"name": {}, "category": {}, "description": {}, "tags": {}, "custom": {},
	"pass_criteria": {}, "benchmarks": {}, "domains": {}, "tasks": {},
	"modalities": {}, "industries": {}, "evaluation_targets": {}, "agent": {},
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
// or '['. YAML is parsed with safe-load semantics: custom tags are rejected,
// nesting depth is bounded, and alias expansion is capped. Only the first
// document of a multi-document YAML file is imported, with a warning.
func parseImportContent(content string) (doc map[string]any, warnings []string, err error) {
	if len(content) > maxImportContentSize {
		return nil, nil, errors.New("File exceeds the 1 MiB size limit")
	}
	if strings.TrimSpace(content) == "" {
		return nil, nil, errors.New("no collection definition found in file")
	}

	trimmed := strings.TrimLeft(content, " \t\r\n")
	if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
		doc, err = parseImportJSON(content)
		return doc, nil, err
	}

	doc, warnings, err = parseImportYAML(content)
	return doc, warnings, err
}

func parseImportJSON(content string) (map[string]any, error) {
	var value any
	if err := json.Unmarshal([]byte(content), &value); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}
	if jsonValueDepth(value, 0) > maxYAMLDepth {
		return nil, fmt.Errorf("JSON nesting exceeds %d levels", maxYAMLDepth)
	}
	return asImportObject(value)
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

	if err := validateImportYAMLNode(&first, 0, new(int)); err != nil {
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

// validateImportYAMLNode walks the node tree before decoding, rejecting
// custom tags (safe-load semantics), nesting deeper than maxYAMLDepth levels,
// and more than maxYAMLAliases alias expansions. Walking the node tree rather
// than the decoded value catches these before alias expansion can allocate.
func validateImportYAMLNode(node *yaml.Node, depth int, aliasCount *int) error {
	if node == nil {
		return nil
	}
	if node.Tag != "" && !strings.HasPrefix(node.Tag, "!!") {
		return fmt.Errorf("YAML custom tags are not allowed (found %q at line %d)", node.Tag, node.Line)
	}
	if node.Kind == yaml.AliasNode {
		*aliasCount++
		if *aliasCount > maxYAMLAliases {
			return fmt.Errorf("YAML documents may not use more than %d aliases", maxYAMLAliases)
		}
		return nil
	}
	if depth > maxYAMLDepth {
		return fmt.Errorf("YAML nesting exceeds %d levels", maxYAMLDepth)
	}
	for _, child := range node.Content {
		if err := validateImportYAMLNode(child, depth+1, aliasCount); err != nil {
			return err
		}
	}
	return nil
}

// jsonValueDepth reports the maximum nesting depth of a decoded JSON value.
func jsonValueDepth(value any, depth int) int {
	switch typed := value.(type) {
	case map[string]any:
		max := depth
		for _, child := range typed {
			if childDepth := jsonValueDepth(child, depth+1); childDepth > max {
				max = childDepth
			}
		}
		return max
	case []any:
		max := depth
		for _, child := range typed {
			if childDepth := jsonValueDepth(child, depth+1); childDepth > max {
				max = childDepth
			}
		}
		return max
	default:
		return depth
	}
}
