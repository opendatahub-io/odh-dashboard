package repositories

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"maps"
	"path"
	"strings"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// KFPColumnAliasMapParamKey is a legacy runtime_config parameter key. KFP rejects
// undeclared pipeline parameters, so new runs store the map in the run description
// instead. Kept so Get/List responses can still reverse-map older payloads if present.
const KFPColumnAliasMapParamKey = "_automl_column_alias_map"

// columnAliasMapDescriptionMarker prefixes a base64url(JSON original→alias) payload
// appended to the KFP run description. Description is not validated against pipeline
// inputs, so this avoids KFP "parameter(s) provided are not required" errors.
// The payload is ASCII-only so it does not reintroduce WorkflowRuntimeManifest charset issues.
const columnAliasMapDescriptionMarker = "\n\n__AUTOML_COLUMN_ALIAS_MAP__:"

// KFPColumnAliasMap maps original column names to ASCII-safe aliases for Kubeflow Pipelines.
type KFPColumnAliasMap map[string]string

func containsNonASCII(s string) bool {
	for _, r := range s {
		if r > 0x7F {
			return true
		}
	}
	return false
}

// CollectNonASCIIKFPColumnNames returns unique non-ASCII column names referenced by the run request.
func CollectNonASCIIKFPColumnNames(req models.CreateAutoMLRunRequest, pipelineType string) []string {
	seen := make(map[string]struct{})
	var names []string

	add := func(name string) {
		name = normalizeColumnName(name)
		if name == "" || !containsNonASCII(name) {
			return
		}
		if _, ok := seen[name]; ok {
			return
		}
		seen[name] = struct{}{}
		names = append(names, name)
	}

	switch pipelineType {
	case constants.PipelineTypeTabular:
		if req.LabelColumn != nil {
			add(*req.LabelColumn)
		}
	case constants.PipelineTypeTimeSeries:
		if req.Target != nil {
			add(*req.Target)
		}
		if req.IDColumn != nil {
			add(*req.IDColumn)
		}
		if req.TimestampColumn != nil {
			add(*req.TimestampColumn)
		}
		if req.KnownCovariatesNames != nil {
			for _, name := range *req.KnownCovariatesNames {
				add(name)
			}
		}
	}

	return names
}

// BuildKFPColumnAliasMap creates deterministic ASCII aliases for the given column names.
func BuildKFPColumnAliasMap(columnNames []string) KFPColumnAliasMap {
	aliases := make(KFPColumnAliasMap, len(columnNames))
	for _, name := range columnNames {
		aliases[name] = kfpColumnAlias(name)
	}
	return aliases
}

func kfpColumnAlias(columnName string) string {
	sum := sha256.Sum256([]byte(columnName))
	return "_ac_" + hex.EncodeToString(sum[:6])
}

// DeriveASCIICompatibleCSVKey returns a content-addressed S3 object key for the rewritten CSV.
func DeriveASCIICompatibleCSVKey(originalKey string, rewrittenCSV []byte) string {
	sum := sha256.Sum256(rewrittenCSV)
	digest := hex.EncodeToString(sum[:6])

	trimmed := strings.TrimSpace(originalKey)
	if trimmed == "" {
		return fmt.Sprintf("automl-ascii.%s.csv", digest)
	}

	ext := path.Ext(trimmed)
	base := strings.TrimSuffix(trimmed, ext)
	if ext == "" {
		return fmt.Sprintf("%s.automl-ascii.%s", base, digest)
	}
	return fmt.Sprintf("%s.automl-ascii.%s%s", base, digest, ext)
}

// RewriteCSVHeaderNames rewrites matching header cells to their ASCII aliases.
func RewriteCSVHeaderNames(csvData []byte, aliases KFPColumnAliasMap) ([]byte, error) {
	if len(aliases) == 0 {
		return csvData, nil
	}

	reader := csv.NewReader(bytes.NewReader(csvData))
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV header: %w", err)
	}
	if len(header) == 0 {
		return nil, fmt.Errorf("CSV file has no columns in header")
	}

	rewrote := false
	for i, colName := range header {
		normalized := normalizeColumnName(colName)
		if alias, ok := aliases[normalized]; ok {
			header[i] = alias
			rewrote = true
		}
	}
	if !rewrote {
		return nil, fmt.Errorf("CSV header does not contain the requested non-ASCII column names")
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)
	if err := writer.Write(header); err != nil {
		return nil, fmt.Errorf("failed to write CSV header: %w", err)
	}

	for {
		record, readErr := reader.Read()
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return nil, fmt.Errorf("failed to read CSV row: %w", readErr)
		}
		if err := writer.Write(record); err != nil {
			return nil, fmt.Errorf("failed to write CSV row: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("failed to finalize CSV rewrite: %w", err)
	}

	return buf.Bytes(), nil
}

// ApplyKFPColumnAliasMap updates run parameters and training file key to use ASCII aliases.
// The original→alias map is copied onto req.ColumnAliasMap for persistence in the run description.
func ApplyKFPColumnAliasMap(
	req models.CreateAutoMLRunRequest,
	aliases KFPColumnAliasMap,
	pipelineType string,
	asciiCSVKey string,
) models.CreateAutoMLRunRequest {
	if len(aliases) == 0 {
		return req
	}

	aliasFor := func(name string) string {
		if alias, ok := aliases[normalizeColumnName(name)]; ok {
			return alias
		}
		return name
	}

	switch pipelineType {
	case constants.PipelineTypeTabular:
		if req.LabelColumn != nil {
			alias := aliasFor(*req.LabelColumn)
			req.LabelColumn = &alias
		}
	case constants.PipelineTypeTimeSeries:
		if req.Target != nil {
			alias := aliasFor(*req.Target)
			req.Target = &alias
		}
		if req.IDColumn != nil {
			alias := aliasFor(*req.IDColumn)
			req.IDColumn = &alias
		}
		if req.TimestampColumn != nil {
			alias := aliasFor(*req.TimestampColumn)
			req.TimestampColumn = &alias
		}
		if req.KnownCovariatesNames != nil {
			names := make([]string, len(*req.KnownCovariatesNames))
			for i, name := range *req.KnownCovariatesNames {
				names[i] = aliasFor(name)
			}
			req.KnownCovariatesNames = &names
		}
	}

	if asciiCSVKey != "" {
		req.TrainDataFileKey = asciiCSVKey
	}

	req.ColumnAliasMap = maps.Clone(aliases)

	return req
}

// AppendColumnAliasMapToDescription appends an ASCII-safe encoding of the alias map
// to the run description for later reverse-mapping. Returns desc unchanged when empty.
func AppendColumnAliasMapToDescription(desc string, aliases map[string]string) string {
	if len(aliases) == 0 {
		return desc
	}
	raw, err := json.Marshal(aliases)
	if err != nil {
		return desc
	}
	encoded := base64.RawURLEncoding.EncodeToString(raw)
	trimmed := strings.TrimRight(desc, "\n")
	return trimmed + columnAliasMapDescriptionMarker + encoded
}

// StripColumnAliasMapFromDescription removes the alias-map marker from description and
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
		// Tolerate padding from StdEncoding if ever written that way.
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
