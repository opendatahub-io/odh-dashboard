package repositories

import (
	"bufio"
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net"
	"net/url"
	"os"
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

func NewS3Repository(devMode bool) *S3Repository {
	// Production guard: prevent ALLOW_UNRESOLVED_S3_ENDPOINTS from being enabled in production
	// This environment variable weakens SSRF protections by allowing DNS resolution failures to "fail open"
	if !devMode && os.Getenv("ALLOW_UNRESOLVED_S3_ENDPOINTS") == "true" {
		slog.Error("ALLOW_UNRESOLVED_S3_ENDPOINTS is enabled but not in development mode",
			"error", "This environment variable bypasses critical SSRF protections and must not be used in production. "+
				"To use this variable for local testing, set -dev-mode flag.")
		os.Exit(1)
	}
	return &S3Repository{}
}

// validateAndNormalizeEndpoint validates the S3 endpoint URL to prevent SSRF attacks.
// It ensures the URL uses HTTPS, is properly formatted, and does not target private IP ranges.
// Returns the normalized URL string or an error if validation fails.
func validateAndNormalizeEndpoint(endpoint string) (string, error) {
	if endpoint == "" {
		return "", fmt.Errorf("endpoint URL cannot be empty")
	}

	// Parse the URL
	parsedURL, err := url.Parse(endpoint)
	if err != nil {
		return "", fmt.Errorf("invalid endpoint URL format: %w", err)
	}

	// Ensure scheme is HTTPS
	if parsedURL.Scheme != "https" {
		return "", fmt.Errorf("endpoint URL must use HTTPS scheme, got: %s", parsedURL.Scheme)
	}

	// Extract hostname (may be hostname or IP)
	hostname := parsedURL.Hostname()
	if hostname == "" {
		return "", fmt.Errorf("endpoint URL must have a valid hostname")
	}

	// Check if the hostname is an IP address
	ip := net.ParseIP(hostname)
	if ip != nil {
		// Direct IP address - validate it
		if err := validateIPAddress(ip); err != nil {
			return "", err
		}
	} else {
		// Hostname - resolve it and validate all IPs
		ips, err := net.LookupIP(hostname)
		if err != nil {
			// Check if permissive mode is enabled for unresolvable hostnames
			allowUnresolved := os.Getenv("ALLOW_UNRESOLVED_S3_ENDPOINTS") == "true"

			if allowUnresolved {
				// Non-production/testing mode: allow with warning
				slog.Warn("Unable to resolve S3 endpoint hostname, allowing it to proceed (ALLOW_UNRESOLVED_S3_ENDPOINTS=true)",
					"hostname", hostname,
					"error", err.Error())
			} else {
				// Production mode: treat DNS resolution failure as a security error
				return "", fmt.Errorf("endpoint hostname '%s' cannot be resolved: %w (this may indicate a DNS rebinding attempt or misconfiguration)", hostname, err)
			}
		} else {
			// Validate all resolved IPs
			for _, resolvedIP := range ips {
				if err := validateIPAddress(resolvedIP); err != nil {
					return "", fmt.Errorf("endpoint hostname '%s' resolves to blocked IP %s: %w", hostname, resolvedIP, err)
				}
			}
		}
	}

	// Return the normalized URL string
	return parsedURL.String(), nil
}

// validateIPAddress checks if an IP address is in a blocked range (private or link-local).
// Returns an error if the IP is blocked, nil otherwise.
func validateIPAddress(ip net.IP) error {
	// Define blocked IP ranges
	blockedRanges := []struct {
		cidr        string
		description string
	}{
		{"0.0.0.0/8", "reserved 'this network' range (RFC 1122)"},
		{"10.0.0.0/8", "RFC-1918 private range (10.0.0.0/8)"},
		{"172.16.0.0/12", "RFC-1918 private range (172.16.0.0/12)"},
		{"192.168.0.0/16", "RFC-1918 private range (192.168.0.0/16)"},
		{"169.254.0.0/16", "link-local range (169.254.0.0/16)"},
		{"127.0.0.0/8", "loopback range (127.0.0.0/8)"},
		{"240.0.0.0/4", "reserved for future use (RFC 1112)"},
		{"::1/128", "IPv6 loopback"},
		{"fe80::/10", "IPv6 link-local"},
		{"fc00::/7", "IPv6 unique local addresses"},
	}

	for _, blocked := range blockedRanges {
		_, network, err := net.ParseCIDR(blocked.cidr)
		if err != nil {
			// Should never happen with hardcoded CIDRs, but handle gracefully
			slog.Error("Failed to parse blocked CIDR", "cidr", blocked.cidr, "error", err)
			continue
		}

		if network.Contains(ip) {
			return fmt.Errorf("endpoint IP %s is in blocked %s", ip, blocked.description)
		}
	}

	return nil
}

// GetS3Credentials retrieves S3 credentials from a Kubernetes secret
func (r *S3Repository) GetS3Credentials(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
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
	rawEndpoint := getValue("AWS_S3_ENDPOINT")
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
	if rawEndpoint == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_S3_ENDPOINT", secretName)
	}

	// Validate and normalize the endpoint URL to prevent SSRF attacks
	validatedEndpoint, err := validateAndNormalizeEndpoint(rawEndpoint)
	if err != nil {
		return nil, fmt.Errorf("secret '%s' has invalid AWS_S3_ENDPOINT: %w", secretName, err)
	}
	creds.EndpointURL = validatedEndpoint

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
	// Revalidate the endpoint on each request to ensure SSRF protection
	validatedEndpoint, err := validateAndNormalizeEndpoint(creds.EndpointURL)
	if err != nil {
		return nil, "", fmt.Errorf("endpoint validation failed: %w", err)
	}

	// Create AWS config with credentials
	cfg := aws.Config{
		Region:      creds.Region,
		Credentials: credentials.NewStaticCredentialsProvider(creds.AccessKeyID, creds.SecretAccessKey, ""),
	}

	// Create S3 client
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(validatedEndpoint)
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

// CSVSchemaResult contains the schema inference result with parsing metadata
type CSVSchemaResult struct {
	Columns       []ColumnSchema `json:"columns"`
	ParseWarnings int            `json:"parse_warnings"`
}

// GetS3CSVSchema retrieves the schema of a CSV file from S3 with inferred column types.
// Reads the header line and a minimum of 100 data rows to determine column types.
//
// Type inference priority (highest to lowest): bool → timestamp → integer → double → string
//
// IMPORTANT: Boolean detection includes "0" and "1" as boolean values (see isBoolean).
// This means columns containing only 0 and 1 will be classified as "bool" not "integer".
// Design rationale: This provides better UI representation for common boolean encodings,
// while the underlying CSV data remains unchanged (numeric values are preserved).
// ML workflows are not impacted as this classification is for schema display only.
//
// Example: A column [0, 1, 0, 1] will be typed as "bool" with values [0, 1].
// To force integer type, ensure the column contains values outside {0,1} (e.g., 2, 3).
//
// Integer is assumed before double - columns are typed as integer until a decimal is found.
// For boolean columns, returns the unique values found in the data.
// Returns an error if the file has fewer than 100 data rows.
//
// Parse warnings: Rows that fail CSV parsing are silently skipped to match the behavior
// of the upstream AutoML backend service. The ParseWarnings count in the result indicates
// how many rows were skipped, allowing clients to detect data quality issues.
func (r *S3Repository) GetS3CSVSchema(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) (CSVSchemaResult, error) {
	// Validate file extension early (case-insensitive)
	if !strings.HasSuffix(strings.ToLower(key), ".csv") {
		return CSVSchemaResult{}, fmt.Errorf("only CSV files are supported (must have .csv extension)")
	}

	// Revalidate the endpoint on each request to ensure SSRF protection
	validatedEndpoint, err := validateAndNormalizeEndpoint(creds.EndpointURL)
	if err != nil {
		return CSVSchemaResult{}, fmt.Errorf("endpoint validation failed: %w", err)
	}

	// Create AWS config with credentials
	cfg := aws.Config{
		Region:      creds.Region,
		Credentials: credentials.NewStaticCredentialsProvider(creds.AccessKeyID, creds.SecretAccessKey, ""),
	}

	// Create S3 client
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(validatedEndpoint)
		// Enable path-style addressing for S3-compatible services like MinIO
		o.UsePathStyle = true
	})

	// Fetch enough data to read header + 100 data rows
	// Start with a reasonable chunk size and expand if needed
	const initialChunkSize = 64 * 1024 // 64KB initial chunk
	maxFetch := 10 * 1024 * 1024       // Safety limit: don't fetch more than 10MB
	var accumulated bytes.Buffer
	bytesFetched := 0
	targetRecords := 101 // header + 100 data rows

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
			// Check if the error is because the range extends past the end of the file
			// This can happen with quoted multiline fields - treat as EOF instead of error
			if strings.Contains(err.Error(), "InvalidRange") ||
				strings.Contains(err.Error(), "invalid range") ||
				strings.Contains(err.Error(), "Requested Range Not Satisfiable") {
				// We've reached the end of the file
				break
			}
			return CSVSchemaResult{}, fmt.Errorf("error retrieving CSV file from S3: %w", err)
		}

		// Validate content type on first chunk.
		// Logs a warning (not error) for unexpected content types, since S3 content-types can be unreliable
		if bytesFetched == 0 && result.ContentType != nil {
			contentType := strings.ToLower(*result.ContentType)
			if !strings.Contains(contentType, "csv") &&
				!strings.Contains(contentType, "text/plain") &&
				!strings.Contains(contentType, "application/vnd.ms-excel") {
				slog.Warn("CSV file has unexpected content type",
					"key", key,
					"contentType", contentType)
			}
		}

		// Read the chunk data with bounded read to prevent memory exhaustion
		// Calculate expected size from the requested range
		expectedSize := int64(rangeEnd - rangeStart + 1)
		readLimit := expectedSize

		// If ContentLength is available and smaller, use it
		if result.ContentLength != nil && *result.ContentLength > 0 && *result.ContentLength < readLimit {
			readLimit = *result.ContentLength
		}

		// Also enforce our safety limit
		maxRemaining := int64(maxFetch - bytesFetched)
		if readLimit > maxRemaining {
			readLimit = maxRemaining
		}

		// Use LimitReader to cap the read to expected size
		limitedReader := io.LimitReader(result.Body, readLimit)
		chunkData, err := io.ReadAll(limitedReader)
		result.Body.Close()
		if err != nil {
			return CSVSchemaResult{}, fmt.Errorf("error reading CSV file data: %w", err)
		}

		// Check if we got an empty response (reached end of file)
		if len(chunkData) == 0 {
			break
		}

		// Append to accumulated data
		accumulated.Write(chunkData)
		bytesFetched += len(chunkData)

		// Parse CSV records to count them properly (handles multiline quoted fields)
		csvReader := csv.NewReader(bytes.NewReader(accumulated.Bytes()))
		csvReader.TrimLeadingSpace = true
		csvReader.LazyQuotes = true

		recordCount := 0
		for {
			_, err := csvReader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				// If we can't parse, we might need more data
				// Continue fetching unless we've hit the safety limit
				break
			}
			recordCount++
			if recordCount >= targetRecords {
				break
			}
		}

		// Check if we have enough complete CSV records
		if recordCount >= targetRecords {
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
		return CSVSchemaResult{}, fmt.Errorf("file does not appear to be a valid text/CSV file (invalid UTF-8)")
	}

	// Check if we have any data
	if len(data) == 0 {
		return CSVSchemaResult{}, fmt.Errorf("CSV file is empty")
	}

	// Parse the CSV data
	reader := csv.NewReader(bytes.NewReader(data))
	reader.TrimLeadingSpace = true
	reader.LazyQuotes = true

	// Read the header
	header, err := reader.Read()
	if err != nil {
		return CSVSchemaResult{}, fmt.Errorf("error reading CSV header: %w", err)
	}

	// Trim whitespace from each column name
	for i := range header {
		header[i] = strings.TrimSpace(header[i])
	}

	// Validate that we have at least one column
	if len(header) == 0 {
		return CSVSchemaResult{}, fmt.Errorf("CSV file has no columns in header")
	}

	// Read data rows and track parse warnings
	var dataRows [][]string
	parseWarnings := 0
	rowNum := 1 // Start at 1 since header is row 0
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			// Parse errors are silently skipped to match upstream AutoML backend behavior.
			// This allows inference to continue with partial data rather than failing entirely.
			// The parseWarnings counter tracks skipped rows so clients can detect data quality issues.
			// Note: not logging error details to avoid leaking CSV data in logs
			slog.Error("Failed to read CSV row, skipping",
				"rowNum", rowNum)
			parseWarnings++
			rowNum++
			continue
		}
		dataRows = append(dataRows, row)
		rowNum++
	}

	// Check if we have at least 100 data rows
	if len(dataRows) < 100 {
		return CSVSchemaResult{}, fmt.Errorf("CSV file must contain at least 100 data rows (excluding header), found %d. Only files with 100 or more lines are supported", len(dataRows))
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

	return CSVSchemaResult{
		Columns:       columnSchemas,
		ParseWarnings: parseWarnings,
	}, nil
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

// inferColumnType infers the data type of a column by examining all values.
//
// Type inference uses a priority-based cascade system (highest to lowest priority):
//  1. bool      - true/false, t/f, yes/no, y/n, AND "0"/"1" (see isBoolean for rationale)
//  2. timestamp - ISO8601, common date formats, Unix epoch timestamps
//  3. integer   - Whole numbers without decimals (excludes 0/1-only columns → classified as bool)
//  4. double    - Numbers with decimal points
//  5. string    - Fallback for all other values
//
// The function starts at the highest priority (bool) and falls back to lower priorities
// if any value in the column doesn't match the current type. Once a value doesn't match,
// all previous values are re-checked against the next priority type.
//
// Example cascade: If a column has ["0", "1", "2"], the "2" fails bool check (not in {0,1}),
// so the function cascades to timestamp check, then integer (which succeeds for all three values).
// Result: "integer" type.
//
// NOTE: This priority order means 0/1-only columns become "bool" not "integer" (deliberate choice).
// See isBoolean() documentation for rationale and implications.
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

// isTimestamp checks if a string represents a timestamp or date.
//
// KNOWN LIMITATION - Timestamp Range Collision:
// 10-digit integers in the range [315,532,800 – 4,102,444,800] (1980-2100) are classified as Unix timestamps.
// This creates potential collisions with non-temporal data that happens to fall in this range:
//   - Product IDs (e.g., 1234567890)
//   - Customer/Order IDs (e.g., 1500000000)
//   - Phone numbers, measurements, or other identifiers
//
// Impact: A column containing ONLY integers in this range will be misclassified as "timestamp" instead of "integer".
// The collision is mitigated by checking ALL values in the column via allValuesMatchType():
//   - If even ONE value is outside [315532800-4102444800], the column falls back to "integer"
//   - This reduces false positives but doesn't eliminate the collision entirely
//
// Design rationale: The range [1980-2100] is chosen to balance:
//   - True positive rate: Captures most real-world Unix timestamps
//   - False positive rate: Minimizes misclassification of arbitrary integers
//
// Future enhancement: Consider column name heuristics (e.g., "created_at", "timestamp", "date")
// as an additional signal before classifying purely numeric columns as timestamps.
//
// See TestInferColumnType "COLLISION" test cases for documented examples.
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

	// Check for Unix timestamp (numeric timestamp in plausible epoch range)
	// Parse as integer first
	if num, err := strconv.ParseInt(s, 10, 64); err == nil {
		// Check for 10-digit seconds (1980-01-01 to 2100-01-01)
		// NOTE: This range overlaps with common ID ranges - see function documentation for collision details
		if num >= 315532800 && num <= 4102444800 {
			return true
		}
		// Check for 13-digit milliseconds (1980-01-01 to 2100-01-01)
		if num >= 315532800000 && num <= 4102444800000 {
			return true
		}
	}

	return false
}

// isBoolean checks if a string represents a boolean value.
//
// DELIBERATE DESIGN CHOICE: Includes "0" and "1" as boolean values.
// This causes columns containing only 0 and 1 to be classified as "bool" instead of "integer".
//
// Rationale:
// - Common boolean encoding in datasets (0=false, 1=true)
// - Provides better UI representation for binary categorical variables
// - Type classification is for display/schema purposes only
// - Does NOT modify underlying CSV data (numeric values are preserved)
// - Does NOT impact ML processing (data remains numeric)
//
// Implication: Binary numeric feature columns (e.g., [0,1,0,1]) will display as "bool".
// This is intentional behavior to support common data conventions where 0/1 represents
// boolean states rather than continuous numeric values.
//
// Accepted values (case-insensitive):
//   - true/false, t/f
//   - yes/no, y/n
//   - 1/0 (treated as boolean, not integer - see note above)
func isBoolean(s string) bool {
	lower := strings.ToLower(s)
	boolValues := []string{
		"true", "false",
		"t", "f",
		"yes", "no",
		"y", "n",
		"1", "0", // Deliberate: classify 0/1 as boolean for UI display (see function doc)
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
				// Check if it's a whole number that fits in int64 range
				if num == math.Floor(num) && num >= math.MinInt64 && num <= math.MaxInt64 {
					orderedValues = append(orderedValues, int64(num))
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
