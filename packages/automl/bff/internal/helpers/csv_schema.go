package helper

import (
	"encoding/csv"
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

// ColumnSchema represents a column with its name and inferred type.
type ColumnSchema struct {
	Name     string        `json:"name"`
	Type     string        `json:"type"`
	TaskType string        `json:"task_type"`
	Values   []interface{} `json:"values,omitempty"`
}

// CSVSchemaResult contains the schema inference result with parsing metadata.
type CSVSchemaResult struct {
	Columns       []ColumnSchema `json:"columns"`
	ParseWarnings int            `json:"parse_warnings"`
}

// maxBinaryUniqueValues is the maximum number of distinct values for a column
// to be classified as binary.
const maxBinaryUniqueValues = 2

// maxMulticlassUniqueValues is the threshold for unique value analysis. It controls both
// task type inference (>maxMulticlassUniqueValues numerical values → regression) and the
// values array in the schema response (omitted when exceeded).
const maxMulticlassUniqueValues = 10

// minDataRowsRequired is the minimum number of data rows (excluding header) required
// for schema inference.
const minDataRowsRequired = 100

// InferCSVSchema reads CSV data from r row by row, collecting exactly minDataRowsRequired
// data rows (or as many as are available) before inferring column types and task types.
//
// Reading stops as soon as minDataRowsRequired rows are collected — callers using a range
// request or io.LimitReader benefit from early connection close after only the rows needed
// have been transferred.
//
// Returns an error if the file has fewer than minDataRowsRequired data rows or is not
// valid UTF-8 CSV.
func InferCSVSchema(r io.Reader) (CSVSchemaResult, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	reader.LazyQuotes = true

	header, err := reader.Read()
	if err != nil {
		if err == io.EOF {
			return CSVSchemaResult{}, fmt.Errorf("CSV file is empty")
		}
		return CSVSchemaResult{}, fmt.Errorf("error reading CSV header: %w", err)
	}
	for i := range header {
		header[i] = strings.TrimSpace(header[i])
	}
	if len(header) == 0 {
		return CSVSchemaResult{}, fmt.Errorf("CSV file has no columns in header")
	}

	var dataRows [][]string
	parseWarnings := 0
	for len(dataRows) < minDataRowsRequired {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			// Validate the header row for UTF-8 on first parse error, as the error
			// may indicate binary/non-text content rather than a malformed row.
			if parseWarnings == 0 {
				for _, col := range header {
					if !utf8.ValidString(col) {
						return CSVSchemaResult{}, fmt.Errorf("file does not appear to be a valid text/CSV file (invalid UTF-8)")
					}
				}
			}
			parseWarnings++
			continue
		}
		dataRows = append(dataRows, row)
	}

	if len(dataRows) < minDataRowsRequired {
		return CSVSchemaResult{}, fmt.Errorf(
			"CSV file must contain at least %d data rows (excluding header), found %d. "+
				"Only files with %d or more lines are supported",
			minDataRowsRequired, len(dataRows), minDataRowsRequired)
	}

	columnSchemas := make([]ColumnSchema, len(header))
	for i, colName := range header {
		uniqueValues := collectUniqueRawValues(dataRows, i)
		taskType := inferTaskType(uniqueValues)
		columnSchemas[i] = ColumnSchema{
			Name:     colName,
			Type:     inferColumnType(dataRows, i),
			TaskType: taskType,
		}
		if taskType == "binary" || (taskType == "multiclass" && len(uniqueValues) <= maxMulticlassUniqueValues) {
			columnSchemas[i].Values = toTypedValues(uniqueValues)
		}
	}

	return CSVSchemaResult{
		Columns:       columnSchemas,
		ParseWarnings: parseWarnings,
	}, nil
}

func inferColumnType(rows [][]string, colIndex int) string {
	if len(rows) == 0 {
		return "string"
	}

	currentType := "bool"

	for _, row := range rows {
		if colIndex >= len(row) || strings.TrimSpace(row[colIndex]) == "" {
			continue
		}

		value := strings.TrimSpace(row[colIndex])

		switch currentType {
		case "bool":
			if !isBoolean(value) {
				currentType = "timestamp"
				if !allValuesMatchType(rows, colIndex, isTimestamp) {
					currentType = "integer"
					if !allValuesMatchType(rows, colIndex, isInteger) {
						currentType = "double"
						if !allValuesMatchType(rows, colIndex, isNumber) {
							currentType = "string"
						}
					}
				}
			}
		case "timestamp":
			if !isTimestamp(value) {
				currentType = "integer"
				if !allValuesMatchType(rows, colIndex, isInteger) {
					currentType = "double"
					if !allValuesMatchType(rows, colIndex, isNumber) {
						currentType = "string"
					}
				}
			}
		case "integer":
			if !isInteger(value) {
				if isNumber(value) {
					currentType = "double"
				} else {
					currentType = "string"
				}
			}
		case "double":
			if !isNumber(value) {
				currentType = "string"
			}
		}

		if currentType == "string" {
			break
		}
	}

	return currentType
}

func allValuesMatchType(rows [][]string, colIndex int, checker func(string) bool) bool {
	for _, row := range rows {
		if colIndex >= len(row) || strings.TrimSpace(row[colIndex]) == "" {
			continue
		}
		if !checker(strings.TrimSpace(row[colIndex])) {
			return false
		}
	}
	return true
}

func parseFiniteFloat(s string) (float64, error) {
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, err
	}
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0, fmt.Errorf("non-finite float: %s", s)
	}
	return v, nil
}

func isNumber(s string) bool {
	_, err := parseFiniteFloat(s)
	return err == nil
}

func isInteger(s string) bool {
	f, err := parseFiniteFloat(s)
	if err != nil {
		return false
	}
	return f == float64(int64(f)) && !strings.Contains(s, ".")
}

func isTimestamp(s string) bool {
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02",
		"01/02/2006",
		"02/01/2006",
		"01-02-2006",
		"02-01-2006",
		"2006/01/02",
		"2006-01-02T15:04:05.999999Z",
		time.RFC1123,
		time.RFC822,
	}

	for _, format := range formats {
		if _, err := time.Parse(format, s); err == nil {
			return true
		}
	}

	if num, err := strconv.ParseInt(s, 10, 64); err == nil {
		if num >= 315532800 && num <= 4102444800 {
			return true
		}
		if num >= 315532800000 && num <= 4102444800000 {
			return true
		}
	}

	return false
}

func isBoolean(s string) bool {
	lower := strings.ToLower(s)
	for _, bv := range []string{"true", "false", "t", "f", "yes", "no", "y", "n", "1", "0"} {
		if lower == bv {
			return true
		}
	}
	return false
}

// collectUniqueRawValues returns distinct non-empty trimmed strings for a column,
// preserving insertion order. Numeric strings are normalized for dedup.
func collectUniqueRawValues(rows [][]string, colIndex int) []string {
	seen := make(map[string]bool)
	var ordered []string

	for _, row := range rows {
		if colIndex >= len(row) || strings.TrimSpace(row[colIndex]) == "" {
			continue
		}
		value := strings.TrimSpace(row[colIndex])
		key := value
		if num, err := parseFiniteFloat(value); err == nil {
			key = strconv.FormatFloat(num, 'g', -1, 64)
		}
		if !seen[key] {
			seen[key] = true
			ordered = append(ordered, value)
		}
	}

	return ordered
}

// toTypedValues converts raw string values to typed representations (int64, float64, or string).
func toTypedValues(rawValues []string) []interface{} {
	result := make([]interface{}, 0, len(rawValues))
	for _, value := range rawValues {
		if num, err := parseFiniteFloat(value); err == nil {
			if num == math.Floor(num) && num >= math.MinInt64 && num <= math.MaxInt64 {
				result = append(result, int64(num))
			} else {
				result = append(result, num)
			}
		} else {
			result = append(result, value)
		}
	}
	return result
}

func inferTaskType(uniqueValues []string) string {
	uniqueCount := len(uniqueValues)
	allNumerical := true
	for _, value := range uniqueValues {
		if _, err := parseFiniteFloat(value); err != nil {
			allNumerical = false
			break
		}
	}

	if uniqueCount > maxMulticlassUniqueValues && allNumerical {
		return "regression"
	}
	if uniqueCount > maxBinaryUniqueValues {
		return "multiclass"
	}
	return "binary"
}
