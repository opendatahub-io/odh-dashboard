package repositories

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"maps"
	"strings"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// KFPColumnAliasMapParamKey is a legacy runtime_config parameter key used by an
// earlier rewrite approach. Kept so Get/List can reverse-map older payloads.
const KFPColumnAliasMapParamKey = "_automl_column_alias_map"

// columnAliasMapDescriptionMarker prefixes a base64url(JSON original→alias) payload
// that older runs may still carry in description. New runs no longer write this marker.
const columnAliasMapDescriptionMarker = "\n\n__AUTOML_COLUMN_ALIAS_MAP__:"

func containsNonASCII(s string) bool {
	for _, r := range s {
		if r > 0x7F {
			return true
		}
	}
	return false
}

// ValidateASCIIColumnNames rejects non-ASCII column names. Kubeflow Pipelines
// MySQL-backed deployments reject multibyte UTF-8 in PipelineRuntimeManifest /
// WorkflowRuntimeManifest, so AutoML blocks these names instead of rewriting CSVs.
func ValidateASCIIColumnNames(req models.CreateAutoMLRunRequest, pipelineType string) error {
	check := func(field, name string) error {
		if name == "" || !containsNonASCII(name) {
			return nil
		}
		return NewValidationError(fmt.Sprintf(
			"%s %q must contain only ASCII characters because Kubeflow Pipelines does not support non-ASCII column names",
			field, name,
		))
	}

	switch pipelineType {
	case constants.PipelineTypeTabular:
		if req.LabelColumn != nil {
			if err := check("label_column", *req.LabelColumn); err != nil {
				return err
			}
		}
	case constants.PipelineTypeTimeSeries:
		if req.Target != nil {
			if err := check("target", *req.Target); err != nil {
				return err
			}
		}
		if req.IDColumn != nil {
			if err := check("id_column", *req.IDColumn); err != nil {
				return err
			}
		}
		if req.TimestampColumn != nil {
			if err := check("timestamp_column", *req.TimestampColumn); err != nil {
				return err
			}
		}
		if req.KnownCovariatesNames != nil {
			for _, name := range *req.KnownCovariatesNames {
				if err := check("known_covariates_names", name); err != nil {
					return err
				}
			}
		}
	}

	return nil
}

// StripColumnAliasMapFromDescription removes a legacy alias-map marker from description and
// returns the decoded original→alias map when present.
func StripColumnAliasMapFromDescription(desc string) (cleanDesc string, aliases map[string]string) {
	idx := strings.LastIndex(desc, columnAliasMapDescriptionMarker)
	if idx < 0 {
		return desc, nil
	}

	cleanDesc = strings.TrimRight(desc[:idx], "\n")
	encoded := strings.TrimSpace(desc[idx+len(columnAliasMapDescriptionMarker):])
	if encoded == "" {
		return cleanDesc, nil
	}

	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		raw, err = base64.URLEncoding.DecodeString(encoded)
		if err != nil {
			return cleanDesc, nil
		}
	}

	var parsed map[string]string
	if err := json.Unmarshal(raw, &parsed); err != nil || len(parsed) == 0 {
		return cleanDesc, nil
	}
	return cleanDesc, parsed
}

// parseColumnAliasMapFromParameters reads a legacy JSON string/object map from runtime params.
func parseColumnAliasMapFromParameters(params map[string]interface{}) map[string]string {
	if params == nil {
		return nil
	}
	raw, ok := params[KFPColumnAliasMapParamKey]
	if !ok {
		return nil
	}
	switch v := raw.(type) {
	case string:
		var parsed map[string]string
		if err := json.Unmarshal([]byte(v), &parsed); err != nil || len(parsed) == 0 {
			return nil
		}
		return parsed
	case map[string]interface{}:
		parsed := make(map[string]string, len(v))
		for original, aliasVal := range v {
			alias, ok := aliasVal.(string)
			if !ok || alias == "" {
				continue
			}
			parsed[original] = alias
		}
		if len(parsed) == 0 {
			return nil
		}
		return parsed
	case map[string]string:
		if len(v) == 0 {
			return nil
		}
		return maps.Clone(v)
	default:
		return nil
	}
}

var columnNameParameterKeys = []string{
	"label_column",
	"target",
	"target_column",
	"id_column",
	"timestamp_column",
}

// RestoreOriginalColumnNamesInParameters reverse-maps ASCII aliases back to originals
// using original→alias. Mutates params in place and removes the legacy alias-map key.
func RestoreOriginalColumnNamesInParameters(params map[string]interface{}, aliases map[string]string) {
	if params == nil {
		return
	}
	delete(params, KFPColumnAliasMapParamKey)
	if len(aliases) == 0 {
		return
	}

	aliasToOriginal := make(map[string]string, len(aliases))
	for original, alias := range aliases {
		aliasToOriginal[alias] = original
	}

	resolveString := func(value string) string {
		if original, ok := aliasToOriginal[value]; ok {
			return original
		}
		return value
	}

	for _, key := range columnNameParameterKeys {
		raw, ok := params[key]
		if !ok {
			continue
		}
		s, ok := raw.(string)
		if !ok {
			continue
		}
		params[key] = resolveString(s)
	}

	if raw, ok := params["known_covariates_names"]; ok {
		switch names := raw.(type) {
		case []string:
			out := make([]string, len(names))
			for i, name := range names {
				out[i] = resolveString(name)
			}
			params["known_covariates_names"] = out
		case []interface{}:
			out := make([]interface{}, len(names))
			for i, item := range names {
				if s, ok := item.(string); ok {
					out[i] = resolveString(s)
				} else {
					out[i] = item
				}
			}
			params["known_covariates_names"] = out
		}
	}
}
