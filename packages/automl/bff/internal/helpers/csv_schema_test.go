package helper

import (
	"fmt"
	"strings"
	"testing"
)

// --- Test Helpers ---

// buildCSV creates a CSV string from a header and rows.
func buildCSV(header []string, rows [][]string) string {
	var sb strings.Builder
	sb.WriteString(strings.Join(header, ","))
	sb.WriteString("\n")
	for _, row := range rows {
		sb.WriteString(strings.Join(row, ","))
		sb.WriteString("\n")
	}
	return sb.String()
}

// repeatRow returns n copies of the given row.
func repeatRow(row []string, n int) [][]string {
	rows := make([][]string, n)
	for i := range rows {
		rows[i] = make([]string, len(row))
		copy(rows[i], row)
	}
	return rows
}

// numberedRows returns n rows where the first column is the row index (as a string)
// and remaining columns are filled with fill.
func numberedRows(n int, cols int, fill string) [][]string {
	rows := make([][]string, n)
	for i := range rows {
		row := make([]string, cols)
		row[0] = fmt.Sprintf("%d", i+100) // start at 100 to avoid boolean detection of 0/1
		for j := 1; j < cols; j++ {
			row[j] = fill
		}
		rows[i] = row
	}
	return rows
}

// === InferCSVSchema ===

func TestInferCSVSchema_EmptyFile(t *testing.T) {
	_, err := InferCSVSchema(strings.NewReader(""))
	if err == nil {
		t.Fatal("expected error for empty file")
	}
	if !strings.Contains(err.Error(), "empty") {
		t.Errorf("expected 'empty' in error, got: %v", err)
	}
}

func TestInferCSVSchema_HeaderOnly(t *testing.T) {
	_, err := InferCSVSchema(strings.NewReader("name,age,active\n"))
	if err == nil {
		t.Fatal("expected error for header-only file")
	}
	if !strings.Contains(err.Error(), "at least") {
		t.Errorf("expected minimum rows error, got: %v", err)
	}
}

func TestInferCSVSchema_TooFewDataRows(t *testing.T) {
	header := []string{"col1", "col2"}
	rows := repeatRow([]string{"a", "b"}, minDataRowsRequired-1)
	csv := buildCSV(header, rows)

	_, err := InferCSVSchema(strings.NewReader(csv))
	if err == nil {
		t.Fatal("expected error for insufficient data rows")
	}
	if !strings.Contains(err.Error(), fmt.Sprintf("%d", minDataRowsRequired)) {
		t.Errorf("expected minimum row count in error, got: %v", err)
	}
}

func TestInferCSVSchema_ExactlyMinRows(t *testing.T) {
	header := []string{"id", "value"}
	rows := numberedRows(minDataRowsRequired, 2, "hello")
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Columns) != 2 {
		t.Fatalf("expected 2 columns, got %d", len(result.Columns))
	}
	if result.Columns[0].Name != "id" {
		t.Errorf("expected column name 'id', got %q", result.Columns[0].Name)
	}
	if result.Columns[1].Name != "value" {
		t.Errorf("expected column name 'value', got %q", result.Columns[1].Name)
	}
}

func TestInferCSVSchema_MoreThanMinRows(t *testing.T) {
	// Verifies that reading stops after minDataRowsRequired rows (early termination).
	header := []string{"x"}
	rows := repeatRow([]string{"42"}, minDataRowsRequired+500)
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Columns) != 1 {
		t.Fatalf("expected 1 column, got %d", len(result.Columns))
	}
}

func TestInferCSVSchema_ParseWarningsCount(t *testing.T) {
	// Rows with wrong column counts are counted as parse warnings by the csv reader
	// when FieldsPerRecord is set (default behavior after reading header).
	// Build a CSV where some rows have extra/missing fields.
	var sb strings.Builder
	sb.WriteString("a,b\n")
	// Write enough valid rows to reach minDataRowsRequired despite some bad rows.
	for i := 0; i < minDataRowsRequired; i++ {
		fmt.Fprintf(&sb, "%d,val\n", i+100)
	}
	// Add malformed rows after enough valid ones have been collected.
	// These won't be reached because reading stops at minDataRowsRequired.
	// Instead, interleave bad rows before the valid ones.

	var sb2 strings.Builder
	sb2.WriteString("a,b\n")
	validCount := 0
	totalLines := 0
	for validCount < minDataRowsRequired {
		if totalLines%10 == 5 {
			// Write a malformed row (3 fields instead of 2)
			sb2.WriteString("x,y,z\n")
		} else {
			fmt.Fprintf(&sb2, "%d,val\n", validCount+100)
			validCount++
		}
		totalLines++
	}

	result, err := InferCSVSchema(strings.NewReader(sb2.String()))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ParseWarnings == 0 {
		t.Error("expected parse warnings > 0 for malformed rows")
	}
}

func TestInferCSVSchema_HeaderWhitespaceTrimmed(t *testing.T) {
	header := []string{"  name  ", " age ", " active "}
	rows := numberedRows(minDataRowsRequired, 3, "hello")
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].Name != "name" {
		t.Errorf("expected trimmed name 'name', got %q", result.Columns[0].Name)
	}
	if result.Columns[1].Name != "age" {
		t.Errorf("expected trimmed name 'age', got %q", result.Columns[1].Name)
	}
	if result.Columns[2].Name != "active" {
		t.Errorf("expected trimmed name 'active', got %q", result.Columns[2].Name)
	}
}

func TestInferCSVSchema_InvalidUTF8(t *testing.T) {
	// Create a header with invalid UTF-8 bytes followed by a bad row to trigger
	// the UTF-8 check on first parse error.
	data := "\xff\xfe,col2\n"
	// Add a malformed row that triggers a parse error.
	data += "a,b,c\n"
	for i := 0; i < minDataRowsRequired; i++ {
		data += "x,y\n"
	}

	_, err := InferCSVSchema(strings.NewReader(data))
	if err == nil {
		t.Fatal("expected error for invalid UTF-8")
	}
	if !strings.Contains(err.Error(), "UTF-8") {
		t.Errorf("expected UTF-8 error, got: %v", err)
	}
}

// === Column Type Inference ===

func TestInferColumnType_StringColumn(t *testing.T) {
	header := []string{"label"}
	rows := make([][]string, minDataRowsRequired)
	labels := []string{"cat", "dog", "bird", "fish", "snake", "lizard", "frog", "turtle", "rabbit", "hamster", "parrot"}
	for i := range rows {
		rows[i] = []string{labels[i%len(labels)]}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].Type != "string" {
		t.Errorf("expected type 'string', got %q", result.Columns[0].Type)
	}
}

func TestInferColumnType_IntegerColumn(t *testing.T) {
	header := []string{"count"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		rows[i] = []string{fmt.Sprintf("%d", i+100)}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].Type != "integer" {
		t.Errorf("expected type 'integer', got %q", result.Columns[0].Type)
	}
}

func TestInferColumnType_DoubleColumn(t *testing.T) {
	header := []string{"price"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		rows[i] = []string{fmt.Sprintf("%d.%d", i+10, i%100)}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].Type != "double" {
		t.Errorf("expected type 'double', got %q", result.Columns[0].Type)
	}
}

func TestInferColumnType_BoolColumn(t *testing.T) {
	header := []string{"flag"}
	rows := make([][]string, minDataRowsRequired)
	boolVals := []string{"true", "false", "True", "False", "yes", "no", "Y", "N", "t", "f"}
	for i := range rows {
		rows[i] = []string{boolVals[i%len(boolVals)]}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].Type != "bool" {
		t.Errorf("expected type 'bool', got %q", result.Columns[0].Type)
	}
}

func TestInferColumnType_BoolZeroOne(t *testing.T) {
	// 0 and 1 are classified as boolean, not integer.
	header := []string{"binary"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		if i%2 == 0 {
			rows[i] = []string{"0"}
		} else {
			rows[i] = []string{"1"}
		}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].Type != "bool" {
		t.Errorf("expected 0/1 to be classified as 'bool', got %q", result.Columns[0].Type)
	}
}

func TestInferColumnType_TimestampColumn(t *testing.T) {
	header := []string{"created_at"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		rows[i] = []string{fmt.Sprintf("2024-01-%02dT10:00:00Z", (i%28)+1)}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].Type != "timestamp" {
		t.Errorf("expected type 'timestamp', got %q", result.Columns[0].Type)
	}
}

func TestInferColumnType_EmptyValuesDefault(t *testing.T) {
	// A column with all empty values should remain "bool" (the initial type),
	// since no value triggers a type downgrade. Test inferColumnType directly
	// because the CSV reader skips blank lines, preventing InferCSVSchema from
	// collecting enough data rows.
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		rows[i] = []string{""}
	}
	result := inferColumnType(rows, 0)
	if result != "bool" {
		t.Errorf("expected type 'bool' for all-empty column, got %q", result)
	}
}

func TestInferColumnType_MixedBoolAndString(t *testing.T) {
	// If a column has mostly booleans but one string, it should be string.
	header := []string{"mixed"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		if i == 50 {
			rows[i] = []string{"not_a_bool"}
		} else {
			rows[i] = []string{"true"}
		}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].Type != "string" {
		t.Errorf("expected type 'string' for mixed bool+string, got %q", result.Columns[0].Type)
	}
}

func TestInferColumnType_MixedIntAndDouble(t *testing.T) {
	// Integers + one double value → double
	header := []string{"number"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		if i == 50 {
			rows[i] = []string{"3.14"}
		} else {
			rows[i] = []string{fmt.Sprintf("%d", i+100)}
		}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].Type != "double" {
		t.Errorf("expected type 'double' for mixed int+double, got %q", result.Columns[0].Type)
	}
}

func TestInferColumnType_NoRows(t *testing.T) {
	// inferColumnType with empty rows returns "string".
	result := inferColumnType(nil, 0)
	if result != "string" {
		t.Errorf("expected 'string' for empty rows, got %q", result)
	}
}

func TestInferColumnType_OutOfBoundsIndex(t *testing.T) {
	// When colIndex is beyond the row length, values are skipped.
	rows := [][]string{{"a"}, {"b"}}
	result := inferColumnType(rows, 5)
	// All values skipped → stays as initial "bool"
	if result != "bool" {
		t.Errorf("expected 'bool' for out-of-bounds index, got %q", result)
	}
}

// === Task Type Inference ===

func TestInferCSVSchema_TaskTypeBinary(t *testing.T) {
	header := []string{"target"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		if i%2 == 0 {
			rows[i] = []string{"yes"}
		} else {
			rows[i] = []string{"no"}
		}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].TaskType != "binary" {
		t.Errorf("expected task type 'binary', got %q", result.Columns[0].TaskType)
	}
	if result.Columns[0].UniqueCount != 2 {
		t.Errorf("expected unique count 2, got %d", result.Columns[0].UniqueCount)
	}
	// Binary columns should include values.
	if result.Columns[0].Values == nil {
		t.Error("expected Values to be populated for binary task type")
	}
}

func TestInferCSVSchema_TaskTypeMulticlass(t *testing.T) {
	header := []string{"category"}
	categories := []string{"cat", "dog", "bird", "fish", "snake"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		rows[i] = []string{categories[i%len(categories)]}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].TaskType != "multiclass" {
		t.Errorf("expected task type 'multiclass', got %q", result.Columns[0].TaskType)
	}
	if result.Columns[0].UniqueCount != 5 {
		t.Errorf("expected unique count 5, got %d", result.Columns[0].UniqueCount)
	}
	// Multiclass with <= maxMulticlassUniqueValues should include values.
	if result.Columns[0].Values == nil {
		t.Error("expected Values for multiclass with few unique values")
	}
}

func TestInferCSVSchema_TaskTypeMulticlassNoValues(t *testing.T) {
	// When multiclass has more than maxMulticlassUniqueValues, values are omitted.
	header := []string{"category"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		rows[i] = []string{fmt.Sprintf("category_%d", i%11)} // 11 > maxMulticlassUniqueValues
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].TaskType != "multiclass" {
		t.Errorf("expected task type 'multiclass', got %q", result.Columns[0].TaskType)
	}
	if result.Columns[0].Values != nil {
		t.Error("expected Values to be nil for multiclass with many unique values")
	}
}

func TestInferCSVSchema_TaskTypeRegression(t *testing.T) {
	// Many unique numerical values → regression.
	header := []string{"price"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		rows[i] = []string{fmt.Sprintf("%d.%02d", i+10, i%100)}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Columns[0].TaskType != "regression" {
		t.Errorf("expected task type 'regression', got %q", result.Columns[0].TaskType)
	}
	// Regression columns should not include values.
	if result.Columns[0].Values != nil {
		t.Error("expected Values to be nil for regression task type")
	}
}

// === Multiple Columns ===

func TestInferCSVSchema_MultipleColumnTypes(t *testing.T) {
	header := []string{"id", "name", "score", "active", "created"}
	rows := make([][]string, minDataRowsRequired)
	for i := range rows {
		rows[i] = []string{
			fmt.Sprintf("%d", i+100),
			fmt.Sprintf("item_%d", i),
			fmt.Sprintf("%d.%d", i, i%10),
			"true",
			fmt.Sprintf("2024-01-%02dT10:00:00Z", (i%28)+1),
		}
	}
	csv := buildCSV(header, rows)

	result, err := InferCSVSchema(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := map[string]string{
		"id":      "integer",
		"name":    "string",
		"score":   "double",
		"active":  "bool",
		"created": "timestamp",
	}

	for _, col := range result.Columns {
		wantType, ok := expected[col.Name]
		if !ok {
			t.Errorf("unexpected column %q", col.Name)
			continue
		}
		if col.Type != wantType {
			t.Errorf("column %q: expected type %q, got %q", col.Name, wantType, col.Type)
		}
	}
}

// === Helper Functions ===

func TestLooksLikeBoolean(t *testing.T) {
	truthy := []string{"true", "True", "TRUE", "false", "False", "FALSE", "t", "T", "f", "F",
		"yes", "Yes", "YES", "no", "No", "NO", "y", "Y", "n", "N", "1", "0"}
	for _, v := range truthy {
		if !looksLikeBoolean(v) {
			t.Errorf("expected %q to be boolean", v)
		}
	}

	falsy := []string{"maybe", "2", "10", "", "truthy", "nope"}
	for _, v := range falsy {
		if looksLikeBoolean(v) {
			t.Errorf("expected %q to not be boolean", v)
		}
	}
}

func TestLooksLikeInteger(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"42", true},
		{"-7", true},
		{"0", true},
		{"999999", true},
		{"3.14", false},
		{"1.0", false},
		{"abc", false},
		{"", false},
		{"NaN", false},
		{"Inf", false},
	}
	for _, tt := range tests {
		got := looksLikeInteger(tt.input)
		if got != tt.want {
			t.Errorf("looksLikeInteger(%q) = %v, want %v", tt.input, got, tt.want)
		}
	}
}

func TestLooksLikeDouble(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"3.14", true},
		{"-0.5", true},
		{"42", true}, // integers are valid doubles
		{"1e10", true},
		{"abc", false},
		{"", false},
		{"NaN", false},
		{"Inf", false},
		{"+Inf", false},
		{"-Inf", false},
	}
	for _, tt := range tests {
		got := looksLikeDouble(tt.input)
		if got != tt.want {
			t.Errorf("looksLikeDouble(%q) = %v, want %v", tt.input, got, tt.want)
		}
	}
}

func TestLooksLikeTimestamp(t *testing.T) {
	valid := []string{
		"2024-01-15T10:30:00Z",
		"2024-01-15T10:30:00",
		"2024-01-15 10:30:00",
		"2024-01-15",
		"01/15/2024",
		"15/01/2024",
		"2024/01/15",
		"1705305600",    // Unix seconds
		"1705305600000", // Unix milliseconds
	}
	for _, v := range valid {
		if !looksLikeTimestamp(v) {
			t.Errorf("expected %q to be a timestamp", v)
		}
	}

	invalid := []string{
		"abc",
		"",
		"12345", // too small for unix timestamp
		"true",
		"3.14",
	}
	for _, v := range invalid {
		if looksLikeTimestamp(v) {
			t.Errorf("expected %q to not be a timestamp", v)
		}
	}
}

func TestCollectUniqueRawValues(t *testing.T) {
	t.Run("deduplicates values", func(t *testing.T) {
		rows := [][]string{{"a"}, {"b"}, {"a"}, {"c"}, {"b"}}
		unique := collectUniqueRawValues(rows, 0)
		if len(unique) != 3 {
			t.Errorf("expected 3 unique values, got %d: %v", len(unique), unique)
		}
	})

	t.Run("preserves insertion order", func(t *testing.T) {
		rows := [][]string{{"c"}, {"a"}, {"b"}, {"a"}}
		unique := collectUniqueRawValues(rows, 0)
		if len(unique) != 3 || unique[0] != "c" || unique[1] != "a" || unique[2] != "b" {
			t.Errorf("expected [c a b], got %v", unique)
		}
	})

	t.Run("skips empty values", func(t *testing.T) {
		rows := [][]string{{"a"}, {""}, {"  "}, {"b"}}
		unique := collectUniqueRawValues(rows, 0)
		if len(unique) != 2 {
			t.Errorf("expected 2 unique values, got %d: %v", len(unique), unique)
		}
	})

	t.Run("skips out-of-bounds columns", func(t *testing.T) {
		rows := [][]string{{"a"}, {"b"}}
		unique := collectUniqueRawValues(rows, 5)
		if len(unique) != 0 {
			t.Errorf("expected 0 unique values for OOB column, got %d", len(unique))
		}
	})

	t.Run("normalizes numeric strings for dedup", func(t *testing.T) {
		// "1.0" and "1" should be deduplicated because they normalize to the same float.
		rows := [][]string{{"1.0"}, {"1"}, {"2"}}
		unique := collectUniqueRawValues(rows, 0)
		if len(unique) != 2 {
			t.Errorf("expected 2 unique values after numeric normalization, got %d: %v", len(unique), unique)
		}
	})
}

func TestToTypedValues(t *testing.T) {
	t.Run("converts integers", func(t *testing.T) {
		result := toTypedValues([]string{"42", "-7", "0"})
		for i, v := range result {
			if _, ok := v.(int64); !ok {
				t.Errorf("result[%d] = %T(%v), expected int64", i, v, v)
			}
		}
	})

	t.Run("converts floats", func(t *testing.T) {
		result := toTypedValues([]string{"3.14", "-0.5"})
		for i, v := range result {
			if _, ok := v.(float64); !ok {
				t.Errorf("result[%d] = %T(%v), expected float64", i, v, v)
			}
		}
	})

	t.Run("preserves strings", func(t *testing.T) {
		result := toTypedValues([]string{"hello", "world"})
		for i, v := range result {
			if _, ok := v.(string); !ok {
				t.Errorf("result[%d] = %T(%v), expected string", i, v, v)
			}
		}
	})

	t.Run("mixed types", func(t *testing.T) {
		result := toTypedValues([]string{"42", "3.14", "hello"})
		if len(result) != 3 {
			t.Fatalf("expected 3 results, got %d", len(result))
		}
		if _, ok := result[0].(int64); !ok {
			t.Errorf("result[0] should be int64, got %T", result[0])
		}
		if _, ok := result[1].(float64); !ok {
			t.Errorf("result[1] should be float64, got %T", result[1])
		}
		if _, ok := result[2].(string); !ok {
			t.Errorf("result[2] should be string, got %T", result[2])
		}
	})
}

func TestInferTaskType(t *testing.T) {
	tests := []struct {
		name     string
		values   []string
		wantType string
	}{
		{
			name:     "binary with 2 values",
			values:   []string{"a", "b"},
			wantType: "binary",
		},
		{
			name:     "binary with 1 value",
			values:   []string{"a"},
			wantType: "binary",
		},
		{
			name:     "binary with 0 values",
			values:   []string{},
			wantType: "binary",
		},
		{
			name:     "multiclass non-numerical",
			values:   []string{"a", "b", "c"},
			wantType: "multiclass",
		},
		{
			name:     "multiclass numerical but few",
			values:   []string{"1", "2", "3"},
			wantType: "multiclass",
		},
		{
			name: "regression many unique numerical",
			values: func() []string {
				s := make([]string, maxMulticlassUniqueValues+1)
				for i := range s {
					s[i] = fmt.Sprintf("%d", i+100)
				}
				return s
			}(),
			wantType: "regression",
		},
		{
			name: "multiclass many unique non-numerical",
			values: func() []string {
				s := make([]string, maxMulticlassUniqueValues+1)
				for i := range s {
					s[i] = fmt.Sprintf("cat_%d", i)
				}
				return s
			}(),
			wantType: "multiclass",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := inferTaskType(tt.values)
			if got != tt.wantType {
				t.Errorf("inferTaskType(%v) = %q, want %q", tt.values, got, tt.wantType)
			}
		})
	}
}

func TestParseFiniteFloat(t *testing.T) {
	t.Run("valid float", func(t *testing.T) {
		v, err := parseFiniteFloat("3.14")
		if err != nil {
			t.Fatal(err)
		}
		if v != 3.14 {
			t.Errorf("expected 3.14, got %f", v)
		}
	})

	t.Run("NaN rejected", func(t *testing.T) {
		_, err := parseFiniteFloat("NaN")
		if err == nil {
			t.Error("expected error for NaN")
		}
	})

	t.Run("Inf rejected", func(t *testing.T) {
		_, err := parseFiniteFloat("Inf")
		if err == nil {
			t.Error("expected error for Inf")
		}
	})

	t.Run("+Inf rejected", func(t *testing.T) {
		_, err := parseFiniteFloat("+Inf")
		if err == nil {
			t.Error("expected error for +Inf")
		}
	})

	t.Run("-Inf rejected", func(t *testing.T) {
		_, err := parseFiniteFloat("-Inf")
		if err == nil {
			t.Error("expected error for -Inf")
		}
	})

	t.Run("invalid string", func(t *testing.T) {
		_, err := parseFiniteFloat("abc")
		if err == nil {
			t.Error("expected error for non-numeric string")
		}
	})
}

// === ErrCSVValidation ===

func TestErrCSVValidation_IsWrapped(t *testing.T) {
	_, err := InferCSVSchema(strings.NewReader(""))
	if err == nil {
		t.Fatal("expected error")
	}

	// The error should wrap ErrCSVValidation so callers can use errors.Is.
	if !strings.Contains(err.Error(), "CSV validation error") {
		t.Errorf("expected error to contain 'CSV validation error', got: %v", err)
	}
}
