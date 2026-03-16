package repositories

import (
	"bufio"
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log/slog"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
)

// S3Credentials contains the credentials needed to connect to S3
type S3Credentials struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	EndpointURL     string
	Bucket          string // Optional bucket name from secret (AWS_S3_BUCKET)
}

type S3Repository struct{}

func NewS3Repository() *S3Repository {
	return &S3Repository{}
}

// GetS3Credentials retrieves S3 credentials from a Kubernetes secret
func (r *S3Repository) GetS3Credentials(
	client k8s.KubernetesClientInterface,
	ctx context.Context,
	namespace string,
	secretName string,
	identity *k8s.RequestIdentity,
) (*S3Credentials, error) {
	// Fetch the specific secret
	secret, err := client.GetSecret(ctx, namespace, secretName, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secret '%s' from namespace %s: %w", secretName, namespace, err)
	}

	// Extract S3 credentials from secret data (case-insensitive key matching)
	creds := &S3Credentials{}
	secretData := secret.Data

	// Helper to get value from secret data case-insensitively
	getValue := func(targetKeys ...string) string {
		// Check all keys in the secret against the target keys (case-insensitive)
		for secretKey, secretValue := range secretData {
			secretKeyLower := strings.ToLower(secretKey)
			for _, targetKey := range targetKeys {
				if secretKeyLower == strings.ToLower(targetKey) {
					return string(secretValue)
				}
			}
		}
		return ""
	}

	creds.AccessKeyID = getValue("AWS_ACCESS_KEY_ID")
	creds.SecretAccessKey = getValue("AWS_SECRET_ACCESS_KEY")
	creds.Region = getValue("AWS_DEFAULT_REGION")
	creds.EndpointURL = getValue("AWS_S3_ENDPOINT")
	creds.Bucket = getValue("AWS_S3_BUCKET") // Optional bucket name

	// Validate that all required fields are present
	if creds.AccessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_ACCESS_KEY_ID", secretName)
	}
	if creds.SecretAccessKey == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_SECRET_ACCESS_KEY", secretName)
	}
	if creds.Region == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_DEFAULT_REGION", secretName)
	}
	if creds.EndpointURL == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_S3_ENDPOINT", secretName)
	}

	return creds, nil
}

// GetS3Object retrieves an object from S3 using transfer manager for optimized downloading
// and returns a reader for the content. Uses concurrent multipart downloads for large files.
func (r *S3Repository) GetS3Object(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) (io.Reader, string, error) {
	// Create AWS config with credentials
	cfg := aws.Config{
		Region:      creds.Region,
		Credentials: credentials.NewStaticCredentialsProvider(creds.AccessKeyID, creds.SecretAccessKey, ""),
	}

	// Create S3 client
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(creds.EndpointURL)
		// Enable path-style addressing for S3-compatible services like MinIO
		o.UsePathStyle = true
	})

	// Create transfer manager for optimized downloads
	transferClient := transfermanager.New(s3Client)

	// Get the object using transfer manager
	// This automatically handles multipart downloads for large files with concurrency
	result, err := transferClient.GetObject(ctx, &transfermanager.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(o *transfermanager.Options) {
		// Configure for optimal streaming performance
		o.Concurrency = 10                  // 10 concurrent part downloads
		o.PartSizeBytes = 64 * 1024 * 1024  // 64MB parts for large files
		o.GetObjectBufferSize = 1024 * 1024 // 1MB buffer for streaming
		o.PartBodyMaxRetries = 3            // Retry failed parts up to 3 times
		o.DisableChecksumValidation = false // Enable checksum validation for data integrity
	})
	if err != nil {
		return nil, "", fmt.Errorf("error retrieving object from S3: %w", err)
	}

	// Get content type, default to application/octet-stream if not specified
	contentType := "application/octet-stream"
	if result.ContentType != nil {
		contentType = *result.ContentType
	}

	// Transfer manager's GetObject returns io.Reader; caller should type-assert to io.Closer if cleanup is needed
	return result.Body, contentType, nil
}

// ColumnSchema represents a column with its name and inferred type
type ColumnSchema struct {
	Name   string        `json:"name"`
	Type   string        `json:"type"`
	Values []interface{} `json:"values,omitempty"`
}

// GetS3CSVSchema retrieves the schema of a CSV file from S3 with inferred column types.
// Reads the header line and a minimum of 100 data rows to determine column types.
// Types are inferred in priority order: bool, timestamp, integer, double, string.
// Integer is assumed before double - columns are typed as integer until a decimal is found.
// For boolean columns, returns the unique values found in the data.
// Returns an error if the file has fewer than 100 data rows.
func (r *S3Repository) GetS3CSVSchema(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) ([]ColumnSchema, error) {
	// Create AWS config with credentials
	cfg := aws.Config{
		Region:      creds.Region,
		Credentials: credentials.NewStaticCredentialsProvider(creds.AccessKeyID, creds.SecretAccessKey, ""),
	}

	// Create S3 client
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(creds.EndpointURL)
		// Enable path-style addressing for S3-compatible services like MinIO
		o.UsePathStyle = true
	})

	// Fetch enough data to read header + 100 data rows
	// Start with a reasonable chunk size and expand if needed
	const initialChunkSize = 64 * 1024 // 64KB initial chunk
	maxFetch := 10 * 1024 * 1024       // Safety limit: don't fetch more than 10MB
	var accumulated bytes.Buffer
	bytesFetched := 0

	for {
		// Calculate the range for this request
		rangeStart := bytesFetched
		rangeEnd := bytesFetched + initialChunkSize - 1
		if rangeEnd-rangeStart+1 > maxFetch-bytesFetched {
			rangeEnd = bytesFetched + maxFetch - bytesFetched - 1
		}
		rangeHeader := fmt.Sprintf("bytes=%d-%d", rangeStart, rangeEnd)

		// Fetch this chunk from S3
		result, err := s3Client.GetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(bucket),
			Key:    aws.String(key),
			Range:  aws.String(rangeHeader),
		})
		if err != nil {
			return nil, fmt.Errorf("error retrieving CSV file from S3: %w", err)
		}

		// Read the chunk data
		chunkData, err := io.ReadAll(result.Body)
		result.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("error reading CSV file data: %w", err)
		}

		// Check if we got an empty response (reached end of file)
		if len(chunkData) == 0 {
			break
		}

		// Append to accumulated data
		accumulated.Write(chunkData)
		bytesFetched += len(chunkData)

		// Count lines to see if we have enough
		lineCount := countLines(accumulated.Bytes())
		// We need header + 100 data rows = 101 lines minimum
		if lineCount >= 101 {
			break
		}

		// Check if we've reached our safety limit
		if bytesFetched >= maxFetch {
			break
		}

		// If we got less data than requested, we've reached the end of the file
		if len(chunkData) < initialChunkSize {
			break
		}
	}

	data := accumulated.Bytes()

	// Check if the data is valid UTF-8
	if !utf8.Valid(data) {
		return nil, fmt.Errorf("file does not appear to be a valid text/CSV file (invalid UTF-8)")
	}

	// Check if we have any data
	if len(data) == 0 {
		return nil, fmt.Errorf("CSV file is empty")
	}

	// Parse the CSV data
	reader := csv.NewReader(bytes.NewReader(data))
	reader.TrimLeadingSpace = true
	reader.LazyQuotes = true

	// Read the header
	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("error reading CSV header: %w", err)
	}

	// Trim whitespace from each column name
	for i := range header {
		header[i] = strings.TrimSpace(header[i])
	}

	// Validate that we have at least one column
	if len(header) == 0 {
		return nil, fmt.Errorf("CSV file has no columns in header")
	}

	// Read data rows
	var dataRows [][]string
	rowNum := 1 // Start at 1 since header is row 0
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			// Log parse error and skip this row instead of failing entire process
			// Note: not logging error details to avoid leaking CSV data in logs
			slog.Error("Failed to read CSV row, skipping",
				"rowNum", rowNum)
			rowNum++
			continue
		}
		dataRows = append(dataRows, row)
		rowNum++
	}

	// Check if we have at least 100 data rows
	if len(dataRows) < 100 {
		return nil, fmt.Errorf("CSV file must contain at least 100 data rows (excluding header), found %d. Only files with 100 or more lines are supported", len(dataRows))
	}

	// Infer types for each column
	columnSchemas := make([]ColumnSchema, len(header))
	for i, colName := range header {
		columnSchemas[i] = ColumnSchema{
			Name: colName,
			Type: inferColumnType(dataRows, i),
		}

		// If it's a boolean column, collect unique values
		if columnSchemas[i].Type == "bool" {
			columnSchemas[i].Values = collectBooleanValues(dataRows, i)
		}
	}

	return columnSchemas, nil
}

// extractFirstLine finds and returns the first complete line from the data.
// Supports \n, \r\n, and \r line endings.
// Returns an error if no complete line is found.
func extractFirstLine(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("no data to parse")
	}

	// Use bufio.Scanner to handle different line endings
	scanner := bufio.NewScanner(bytes.NewReader(data))

	// Custom split function to handle \n, \r\n, and \r
	scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
		if atEOF && len(data) == 0 {
			return 0, nil, nil
		}

		// Find the earliest line ending (any of \r\n, \n, or \r)
		crlfPos := bytes.Index(data, []byte("\r\n"))
		lfPos := bytes.IndexByte(data, '\n')
		crPos := bytes.IndexByte(data, '\r')

		// Find the earliest line ending position
		minPos := -1
		lineEndingLen := 0

		// Check CRLF
		if crlfPos >= 0 {
			minPos = crlfPos
			lineEndingLen = 2
		}

		// Check LF (if earlier than CRLF or CRLF not found)
		if lfPos >= 0 && (minPos < 0 || lfPos < minPos) {
			minPos = lfPos
			lineEndingLen = 1
		}

		// Check CR (if earlier than others or others not found)
		// Also ensure CR is not part of CRLF
		if crPos >= 0 && (minPos < 0 || crPos < minPos) {
			minPos = crPos
			lineEndingLen = 1
		}

		// If we found a line ending, return the line
		if minPos >= 0 {
			return minPos + lineEndingLen, data[0:minPos], nil
		}

		// If we're at EOF, return what we have only if there's content
		// This handles files without a trailing newline
		if atEOF {
			// But for our use case, we require at least one complete line
			// So if we're at EOF and haven't found a line ending, that's an error
			return 0, nil, fmt.Errorf("CSV file must contain at least one complete line (no line ending found)")
		}

		// Request more data
		return 0, nil, nil
	})

	if scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			return "", fmt.Errorf("first line of CSV file is empty")
		}
		return line, nil
	}

	if err := scanner.Err(); err != nil {
		return "", err
	}

	return "", fmt.Errorf("CSV file must contain at least one complete line")
}

// countLines counts the number of lines in the data
// Handles \r, \n, and \r\n line endings correctly
func countLines(data []byte) int {
	count := 0
	for i := 0; i < len(data); i++ {
		switch data[i] {
		case '\n':
			count++
		case '\r':
			// Only count \r if it's not part of \r\n
			if i+1 >= len(data) || data[i+1] != '\n' {
				count++
			}
		}
	}
	return count
}

// inferColumnType infers the data type of a column by examining all values
// Types are checked in priority order: bool, timestamp, integer, double, string
// Falls back to a lower priority type if any value doesn't match the current type
func inferColumnType(rows [][]string, colIndex int) string {
	if len(rows) == 0 {
		return "string"
	}

	currentType := "bool" // Start with the highest priority type

	for _, row := range rows {
		// Skip if column doesn't exist in this row or is empty
		if colIndex >= len(row) || strings.TrimSpace(row[colIndex]) == "" {
			continue
		}

		value := strings.TrimSpace(row[colIndex])

		// Check types in priority order
		switch currentType {
		case "bool":
			if !isBoolean(value) {
				// Fall back to timestamp
				currentType = "timestamp"
				// Re-check all previous values for timestamp
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
				// Fall back to integer
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
				// Check if it's a double
				if isNumber(value) {
					// Fall back to double
					currentType = "double"
				} else {
					// Fall back to string
					currentType = "string"
				}
			}
		case "double":
			if !isNumber(value) {
				// Fall back to string
				currentType = "string"
			}
		}

		// If we've fallen all the way to string, no need to check further
		if currentType == "string" {
			break
		}
	}

	return currentType
}

// allValuesMatchType checks if all non-empty values in a column match a type checker function
func allValuesMatchType(rows [][]string, colIndex int, checker func(string) bool) bool {
	for _, row := range rows {
		if colIndex >= len(row) || strings.TrimSpace(row[colIndex]) == "" {
			continue
		}
		value := strings.TrimSpace(row[colIndex])
		if !checker(value) {
			return false
		}
	}
	return true
}

// isNumber checks if a string represents a number (integer or float)
func isNumber(s string) bool {
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}

// isInteger checks if a string represents an integer (no decimal point)
func isInteger(s string) bool {
	// First check if it's a valid number
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return false
	}
	// Check if it's a whole number (no decimal part)
	return f == float64(int64(f)) && !strings.Contains(s, ".")
}

// isTimestamp checks if a string represents a timestamp or date
func isTimestamp(s string) bool {
	// Common timestamp formats to check
	formats := []string{
		time.RFC3339,                  // 2006-01-02T15:04:05Z07:00
		"2006-01-02T15:04:05",         // ISO8601 without timezone
		"2006-01-02 15:04:05",         // Common datetime format
		"2006-01-02",                  // Date only (YYYY-MM-DD)
		"01/02/2006",                  // MM/DD/YYYY
		"02/01/2006",                  // DD/MM/YYYY
		"01-02-2006",                  // MM-DD-YYYY
		"02-01-2006",                  // DD-MM-YYYY
		"2006/01/02",                  // YYYY/MM/DD
		"2006-01-02T15:04:05.999999Z", // ISO8601 with microseconds
		time.RFC1123,                  // Mon, 02 Jan 2006 15:04:05 MST
		time.RFC822,                   // 02 Jan 06 15:04 MST
	}

	for _, format := range formats {
		if _, err := time.Parse(format, s); err == nil {
			return true
		}
	}

	// Check for Unix timestamp (numeric timestamp)
	if matched, _ := regexp.MatchString(`^\d{10}$|^\d{13}$`, s); matched {
		return true
	}

	return false
}

// isBoolean checks if a string represents a boolean value
func isBoolean(s string) bool {
	lower := strings.ToLower(s)
	boolValues := []string{
		"true", "false",
		"t", "f",
		"yes", "no",
		"y", "n",
		"1", "0",
	}

	for _, bv := range boolValues {
		if lower == bv {
			return true
		}
	}
	return false
}

// collectBooleanValues collects unique boolean values from a column
func collectBooleanValues(rows [][]string, colIndex int) []interface{} {
	uniqueValues := make(map[string]bool)
	var orderedValues []interface{}

	for _, row := range rows {
		if colIndex >= len(row) || strings.TrimSpace(row[colIndex]) == "" {
			continue
		}
		value := strings.TrimSpace(row[colIndex])
		if !uniqueValues[value] {
			uniqueValues[value] = true
			// Try to parse as number, otherwise keep as string
			if num, err := strconv.ParseFloat(value, 64); err == nil {
				// If it's a whole number, store as int
				if num == float64(int(num)) {
					orderedValues = append(orderedValues, int(num))
				} else {
					orderedValues = append(orderedValues, num)
				}
			} else {
				orderedValues = append(orderedValues, value)
			}
		}
	}

	return orderedValues
}
