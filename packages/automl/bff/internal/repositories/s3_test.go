package repositories

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsNumber(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"integer", "123", true},
		{"negative integer", "-456", true},
		{"float", "123.456", true},
		{"negative float", "-123.456", true},
		{"scientific notation", "1.23e10", true},
		{"string", "abc", false},
		{"mixed", "123abc", false},
		{"empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isNumber(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsInteger(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"positive integer", "123", true},
		{"negative integer", "-456", true},
		{"zero", "0", true},
		{"large integer", "999999999", true},
		{"float with decimal point", "123.456", false},
		{"float without fraction", "123.0", false},
		{"negative float", "-123.456", false},
		{"scientific notation", "1.23e10", false},
		{"string", "abc", false},
		{"mixed", "123abc", false},
		{"empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isInteger(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsTimestamp(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"ISO8601", "2024-03-13T10:30:00Z", true},
		{"ISO8601 without timezone", "2024-03-13T10:30:00", true},
		{"Common datetime", "2024-03-13 10:30:00", true},
		{"Date only YYYY-MM-DD", "2024-03-13", true},
		{"MM/DD/YYYY", "03/13/2024", true},
		{"DD/MM/YYYY", "13/03/2024", true},
		{"Unix timestamp 10 digits", "1710328200", true},
		{"Unix timestamp 13 digits", "1710328200000", true},
		{"Not a timestamp", "abc", false},
		{"Number", "123", false},
		{"Empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isTimestamp(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsBoolean(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"true lowercase", "true", true},
		{"false lowercase", "false", true},
		{"TRUE uppercase", "TRUE", true},
		{"FALSE uppercase", "FALSE", true},
		{"t", "t", true},
		{"f", "f", true},
		{"T", "T", true},
		{"F", "F", true},
		{"yes", "yes", true},
		{"no", "no", true},
		{"y", "y", true},
		{"n", "n", true},
		{"1", "1", true},
		{"0", "0", true},
		{"not boolean", "maybe", false},
		{"number", "123", false},
		{"empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isBoolean(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestInferColumnType(t *testing.T) {
	tests := []struct {
		name     string
		rows     [][]string
		colIndex int
		expected string
	}{
		{
			name: "all booleans",
			rows: [][]string{
				{"true", "value"},
				{"false", "value"},
				{"true", "value"},
			},
			colIndex: 0,
			expected: "bool",
		},
		{
			name: "boolean values with 0 and 1",
			rows: [][]string{
				{"0", "value"},
				{"1", "value"},
				{"0", "value"},
			},
			colIndex: 0,
			expected: "bool",
		},
		{
			name: "all timestamps",
			rows: [][]string{
				{"2024-03-13", "value"},
				{"2024-03-14", "value"},
				{"2024-03-15", "value"},
			},
			colIndex: 0,
			expected: "timestamp",
		},
		{
			name: "all integers (not boolean)",
			rows: [][]string{
				{"123", "456"},
				{"789", "012"},
				{"345", "678"},
			},
			colIndex: 0,
			expected: "integer",
		},
		{
			name: "all strings",
			rows: [][]string{
				{"alice", "value"},
				{"bob", "value"},
				{"charlie", "value"},
			},
			colIndex: 0,
			expected: "string",
		},
		{
			name: "mixed boolean and string - falls to string",
			rows: [][]string{
				{"true", "value"},
				{"maybe", "value"},
				{"false", "value"},
			},
			colIndex: 0,
			expected: "string",
		},
		{
			name: "mixed timestamp and string - falls to string",
			rows: [][]string{
				{"2024-03-13", "value"},
				{"not a date", "value"},
				{"2024-03-15", "value"},
			},
			colIndex: 0,
			expected: "string",
		},
		{
			name: "mixed integer and string - falls to string",
			rows: [][]string{
				{"123", "value"},
				{"abc", "value"},
				{"456", "value"},
			},
			colIndex: 0,
			expected: "string",
		},
		{
			name: "empty values ignored - integers",
			rows: [][]string{
				{"123", "value"},
				{"", "value"},
				{"456", "value"},
			},
			colIndex: 0,
			expected: "integer",
		},
		{
			name: "integers that are not booleans",
			rows: [][]string{
				{"2", "value"},
				{"3", "value"},
				{"4", "value"},
			},
			colIndex: 0,
			expected: "integer",
		},
		{
			name: "decimal numbers - double",
			rows: [][]string{
				{"1.5", "value"},
				{"2.7", "value"},
				{"3.9", "value"},
			},
			colIndex: 0,
			expected: "double",
		},
		{
			name: "mixed integers and decimals - falls to double",
			rows: [][]string{
				{"123", "value"},
				{"456.789", "value"},
				{"100", "value"},
			},
			colIndex: 0,
			expected: "double",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := inferColumnType(tt.rows, tt.colIndex)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCollectBooleanValues(t *testing.T) {
	tests := []struct {
		name     string
		rows     [][]string
		colIndex int
		expected []interface{}
	}{
		{
			name: "numeric booleans",
			rows: [][]string{
				{"0", "value"},
				{"1", "value"},
				{"0", "value"},
			},
			colIndex: 0,
			expected: []interface{}{int64(0), int64(1)},
		},
		{
			name: "string booleans",
			rows: [][]string{
				{"true", "value"},
				{"false", "value"},
				{"true", "value"},
			},
			colIndex: 0,
			expected: []interface{}{"true", "false"},
		},
		{
			name: "mixed t and f",
			rows: [][]string{
				{"T", "value"},
				{"F", "value"},
				{"T", "value"},
			},
			colIndex: 0,
			expected: []interface{}{"T", "F"},
		},
		{
			name: "empty values ignored",
			rows: [][]string{
				{"yes", "value"},
				{"", "value"},
				{"no", "value"},
			},
			colIndex: 0,
			expected: []interface{}{"yes", "no"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := collectBooleanValues(tt.rows, tt.colIndex)
			assert.Equal(t, len(tt.expected), len(result))
			for i, expected := range tt.expected {
				assert.Equal(t, expected, result[i])
			}
		})
	}
}

func TestCountLines(t *testing.T) {
	tests := []struct {
		name     string
		input    []byte
		expected int
	}{
		{"no newlines", []byte("hello world"), 0},
		{"one newline", []byte("hello\nworld"), 1},
		{"multiple newlines", []byte("line1\nline2\nline3\n"), 3},
		{"empty", []byte(""), 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := countLines(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestExtractFirstLine(t *testing.T) {
	tests := []struct {
		name        string
		input       []byte
		expected    string
		expectError bool
	}{
		{
			name:        "Unix line ending (LF)",
			input:       []byte("first line\nsecond line"),
			expected:    "first line",
			expectError: false,
		},
		{
			name:        "Windows line ending (CRLF)",
			input:       []byte("first line\r\nsecond line"),
			expected:    "first line",
			expectError: false,
		},
		{
			name:        "Old Mac line ending (CR)",
			input:       []byte("first line\rsecond line"),
			expected:    "first line",
			expectError: false,
		},
		{
			name:        "Mixed line endings",
			input:       []byte("first line\nsecond\r\nthird\rfourth"),
			expected:    "first line",
			expectError: false,
		},
		{
			name:        "No line ending (incomplete)",
			input:       []byte("only one line without newline"),
			expected:    "",
			expectError: true,
		},
		{
			name:        "Empty data",
			input:       []byte(""),
			expected:    "",
			expectError: true,
		},
		{
			name:        "Empty first line",
			input:       []byte("\nsecond line"),
			expected:    "",
			expectError: true,
		},
		{
			name:        "Line with trailing newline only",
			input:       []byte("header\n"),
			expected:    "header",
			expectError: false,
		},
		{
			name:        "CSV header example",
			input:       []byte("id,name,age\n1,Alice,30\n2,Bob,25"),
			expected:    "id,name,age",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractFirstLine(tt.input)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestAllValuesMatchType(t *testing.T) {
	tests := []struct {
		name     string
		rows     [][]string
		colIndex int
		checker  func(string) bool
		expected bool
	}{
		{
			name: "all integers match",
			rows: [][]string{
				{"123", "value"},
				{"456", "value"},
				{"789", "value"},
			},
			colIndex: 0,
			checker:  isInteger,
			expected: true,
		},
		{
			name: "mixed integers and non-integers",
			rows: [][]string{
				{"123", "value"},
				{"not a number", "value"},
				{"789", "value"},
			},
			colIndex: 0,
			checker:  isInteger,
			expected: false,
		},
		{
			name: "empty values are ignored",
			rows: [][]string{
				{"123", "value"},
				{"", "value"},
				{"789", "value"},
			},
			colIndex: 0,
			checker:  isInteger,
			expected: true,
		},
		{
			name: "all booleans match",
			rows: [][]string{
				{"true", "value"},
				{"false", "value"},
				{"yes", "value"},
			},
			colIndex: 0,
			checker:  isBoolean,
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := allValuesMatchType(tt.rows, tt.colIndex, tt.checker)
			assert.Equal(t, tt.expected, result)
		})
	}
}
