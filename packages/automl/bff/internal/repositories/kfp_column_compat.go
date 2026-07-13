package repositories

import (
	"bytes"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"fmt"
	"io"
	"path"
	"strings"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

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
	reader.ReuseRecord = true
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

	return req
}
