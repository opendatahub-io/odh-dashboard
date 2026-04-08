package s3

import (
	"bufio"
	"bytes"
	"context"
	"encoding/csv"
	"errors"
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
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// ErrEndpointValidation is returned when the configured S3 endpoint fails URL or SSRF validation.
// Use errors.Is to classify CreateClient / NewRealS3Client failures.
var ErrEndpointValidation = errors.New("endpoint validation failed")

// ErrObjectAlreadyExists is returned by UploadObject when the object key already exists.
// Uploads use S3 conditional create (If-None-Match: *): 412 Precondition Failed or 409 ConditionalRequestConflict.
var ErrObjectAlreadyExists = errors.New("s3 object already exists at key")

// S3Credentials contains the credentials needed to connect to S3.
type S3Credentials struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	EndpointURL     string
	Bucket          string // Optional bucket name from secret (AWS_S3_BUCKET)
}

// ListObjectsOptions contains parameters for listing S3 objects.
type ListObjectsOptions struct {
	Path   string // Virtual prefix / "folder" to list within
	Search string // Substring filter appended to the prefix
	Next   string // Continuation token for pagination
	Limit  int32  // Maximum number of keys per page
}

// ColumnSchema represents a column with its name and inferred type.
type ColumnSchema struct {
	Name   string        `json:"name"`
	Type   string        `json:"type"`
	Values []interface{} `json:"values,omitempty"`
}

// CSVSchemaResult contains the schema inference result with parsing metadata.
type CSVSchemaResult struct {
	Columns       []ColumnSchema `json:"columns"`
	ParseWarnings int            `json:"parse_warnings"`
}

// S3ClientInterface defines the operations available on an S3 client.
type S3ClientInterface interface {
	GetObject(ctx context.Context, bucket, key string) (io.ReadCloser, string, error)
	UploadObject(ctx context.Context, bucket, key string, body io.Reader, contentType string) error
	ListObjects(ctx context.Context, bucket string, options ListObjectsOptions) (*models.S3ListObjectsResponse, error)
	GetCSVSchema(ctx context.Context, bucket, key string) (CSVSchemaResult, error)
	ObjectExists(ctx context.Context, bucket, key string) (bool, error)
}

// RealS3Client implements S3ClientInterface using the AWS SDK.
type RealS3Client struct {
	s3Client *awss3.Client
	options  S3ClientOptions
}

// NewRealS3Client creates a new S3 client from credentials, validating the endpoint.
func NewRealS3Client(creds *S3Credentials, opts S3ClientOptions) (*RealS3Client, error) {
	if creds == nil {
		return nil, fmt.Errorf("S3Credentials must not be nil")
	}

	c := &RealS3Client{options: opts.withDefaults()}

	validatedEndpoint, err := c.validateAndNormalizeEndpoint(creds.EndpointURL)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrEndpointValidation, err)
	}

	cfg := aws.Config{
		Region:      creds.Region,
		Credentials: credentials.NewStaticCredentialsProvider(creds.AccessKeyID, creds.SecretAccessKey, ""),
	}

	c.s3Client = awss3.NewFromConfig(cfg, func(o *awss3.Options) {
		o.BaseEndpoint = aws.String(validatedEndpoint)
		o.UsePathStyle = true
	})

	return c, nil
}

// GetObject retrieves an object from S3 using transfer manager for optimized downloading.
func (c *RealS3Client) GetObject(ctx context.Context, bucket, key string) (io.ReadCloser, string, error) {
	transferClient := transfermanager.New(c.s3Client)

	result, err := transferClient.GetObject(ctx, &transfermanager.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(o *transfermanager.Options) {
		o.Concurrency = c.options.Concurrency
		o.PartSizeBytes = c.options.PartSizeBytes
		o.GetObjectBufferSize = c.options.GetObjectBufSize
		o.PartBodyMaxRetries = c.options.PartBodyMaxRetries
		o.DisableChecksumValidation = false
	})
	if err != nil {
		return nil, "", fmt.Errorf("error retrieving object from S3: %w", err)
	}

	contentType := "application/octet-stream"
	if result.ContentType != nil {
		contentType = *result.ContentType
	}

	body, ok := result.Body.(io.ReadCloser)
	if !ok {
		body = io.NopCloser(result.Body)
	}

	return body, contentType, nil
}

// UploadObject uploads an object to S3 using the transfer manager (same client/endpoint config as GetObject).
// Returns ErrObjectAlreadyExists when S3 reports a conditional write conflict.
func (c *RealS3Client) UploadObject(ctx context.Context, bucket, key string, body io.Reader, contentType string) error {
	transferClient := transfermanager.New(c.s3Client)

	_, err := transferClient.UploadObject(ctx, &transfermanager.UploadObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
		IfNoneMatch: aws.String("*"),
	}, func(o *transfermanager.Options) {
		o.Concurrency = c.options.Concurrency
		o.PartSizeBytes = c.options.PartSizeBytes
	})
	if err != nil {
		if isS3ConditionalCreateConflict(err) {
			return ErrObjectAlreadyExists
		}
		return fmt.Errorf("error uploading object to S3: %w", err)
	}
	return nil
}

func isS3ConditionalCreateConflict(err error) bool {
	var codedError interface{ ErrorCode() string }
	if errors.As(err, &codedError) {
		switch codedError.ErrorCode() {
		case "PreconditionFailed", "ConditionalRequestConflict":
			return true
		}
	}
	return false
}

// ObjectExists checks whether an object key already exists in the given bucket.
func (c *RealS3Client) ObjectExists(ctx context.Context, bucket, key string) (bool, error) {
	_, err := c.s3Client.HeadObject(ctx, &awss3.HeadObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err == nil {
		return true, nil
	}

	var notFound *types.NotFound
	var noSuchKey *types.NoSuchKey
	if errors.As(err, &notFound) || errors.As(err, &noSuchKey) {
		return false, nil
	}

	var codedError interface{ ErrorCode() string }
	if errors.As(err, &codedError) {
		switch codedError.ErrorCode() {
		case "NotFound", "NoSuchKey", "404":
			return false, nil
		}
	}

	return false, fmt.Errorf("error checking object existence in S3: %w", err)
}

// ListObjects retrieves a listing of objects from S3 using ListObjectsV2.
func (c *RealS3Client) ListObjects(ctx context.Context, bucket string, options ListObjectsOptions) (*models.S3ListObjectsResponse, error) {
	prefix := options.Search
	if options.Path != "" {
		path := options.Path
		if !strings.HasSuffix(path, "/") {
			path += "/"
		}
		prefix = path + options.Search
	}

	input := &awss3.ListObjectsV2Input{
		Bucket:    aws.String(bucket),
		Delimiter: aws.String("/"),
		Prefix:    aws.String(prefix),
		MaxKeys:   aws.Int32(options.Limit),
	}
	if options.Next != "" {
		input.ContinuationToken = aws.String(options.Next)
	}

	output, err := c.s3Client.ListObjectsV2(ctx, input)
	if err != nil {
		return nil, err
	}

	result := &models.S3ListObjectsResponse{
		IsTruncated:           aws.ToBool(output.IsTruncated),
		KeyCount:              aws.ToInt32(output.KeyCount),
		MaxKeys:               aws.ToInt32(output.MaxKeys),
		Name:                  aws.ToString(output.Name),
		Prefix:                aws.ToString(output.Prefix),
		Delimiter:             aws.ToString(output.Delimiter),
		ContinuationToken:     aws.ToString(output.ContinuationToken),
		NextContinuationToken: aws.ToString(output.NextContinuationToken),
		CommonPrefixes:        []models.S3CommonPrefix{},
		Contents:              []models.S3ObjectInfo{},
	}

	for _, cp := range output.CommonPrefixes {
		result.CommonPrefixes = append(result.CommonPrefixes, models.S3CommonPrefix{Prefix: aws.ToString(cp.Prefix)})
	}

	for _, obj := range output.Contents {
		info := models.S3ObjectInfo{
			Key:          aws.ToString(obj.Key),
			Size:         aws.ToInt64(obj.Size),
			ETag:         aws.ToString(obj.ETag),
			StorageClass: string(obj.StorageClass),
		}
		if obj.LastModified != nil {
			info.LastModified = obj.LastModified.Format(time.RFC3339)
		}
		result.Contents = append(result.Contents, info)
	}

	return result, nil
}

// GetCSVSchema retrieves the schema of a CSV file from S3 with inferred column types.
// Reads the header and a minimum of 100 data rows to determine column types.
//
// Type inference priority (highest to lowest): bool → timestamp → integer → double → string
//
// IMPORTANT: Boolean detection includes "0" and "1" as boolean values (see isBoolean).
// Returns an error if the file has fewer than 100 data rows.
func (c *RealS3Client) GetCSVSchema(ctx context.Context, bucket, key string) (CSVSchemaResult, error) {
	if !strings.HasSuffix(strings.ToLower(key), ".csv") {
		return CSVSchemaResult{}, fmt.Errorf("only CSV files are supported (must have .csv extension)")
	}

	const initialChunkSize = 64 * 1024 // 64KB initial chunk
	maxFetch := 10 * 1024 * 1024       // Safety limit: don't fetch more than 10MB
	var accumulated bytes.Buffer
	bytesFetched := 0
	targetRecords := 101 // header + 100 data rows

	for {
		rangeStart := bytesFetched
		rangeEnd := bytesFetched + initialChunkSize - 1
		if rangeEnd-rangeStart+1 > maxFetch-bytesFetched {
			rangeEnd = bytesFetched + maxFetch - bytesFetched - 1
		}
		rangeHeader := fmt.Sprintf("bytes=%d-%d", rangeStart, rangeEnd)

		result, err := c.s3Client.GetObject(ctx, &awss3.GetObjectInput{
			Bucket: aws.String(bucket),
			Key:    aws.String(key),
			Range:  aws.String(rangeHeader),
		})
		if err != nil {
			if strings.Contains(err.Error(), "InvalidRange") ||
				strings.Contains(err.Error(), "invalid range") ||
				strings.Contains(err.Error(), "Requested Range Not Satisfiable") {
				break
			}
			return CSVSchemaResult{}, fmt.Errorf("error retrieving CSV file from S3: %w", err)
		}

		if bytesFetched == 0 && result.ContentType != nil {
			contentType := strings.ToLower(*result.ContentType)
			if !strings.Contains(contentType, "csv") &&
				!strings.Contains(contentType, "text/plain") &&
				!strings.Contains(contentType, "application/vnd.ms-excel") &&
				!strings.Contains(contentType, "application/octet-stream") {
				slog.Warn("CSV file has unexpected content type", "key", key, "contentType", contentType)
			}
		}

		expectedSize := int64(rangeEnd - rangeStart + 1)
		readLimit := expectedSize
		if result.ContentLength != nil && *result.ContentLength > 0 && *result.ContentLength < readLimit {
			readLimit = *result.ContentLength
		}
		maxRemaining := int64(maxFetch - bytesFetched)
		if readLimit > maxRemaining {
			readLimit = maxRemaining
		}

		limitedReader := io.LimitReader(result.Body, readLimit)
		chunkData, err := io.ReadAll(limitedReader)
		result.Body.Close()
		if err != nil {
			return CSVSchemaResult{}, fmt.Errorf("error reading CSV file data: %w", err)
		}
		if len(chunkData) == 0 {
			break
		}

		accumulated.Write(chunkData)
		bytesFetched += len(chunkData)

		csvReader := csv.NewReader(bytes.NewReader(normalizeLineEndings(accumulated.Bytes())))
		csvReader.TrimLeadingSpace = true
		csvReader.LazyQuotes = true

		recordCount := 0
		for {
			_, err := csvReader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				break
			}
			recordCount++
			if recordCount >= targetRecords {
				break
			}
		}
		if recordCount >= targetRecords {
			break
		}
		if bytesFetched >= maxFetch {
			break
		}
		if len(chunkData) < initialChunkSize {
			break
		}
	}

	data := normalizeLineEndings(accumulated.Bytes())

	if !utf8.Valid(data) {
		return CSVSchemaResult{}, fmt.Errorf("file does not appear to be a valid text/CSV file (invalid UTF-8)")
	}
	if len(data) == 0 {
		return CSVSchemaResult{}, fmt.Errorf("CSV file is empty")
	}

	reader := csv.NewReader(bytes.NewReader(data))
	reader.TrimLeadingSpace = true
	reader.LazyQuotes = true

	header, err := reader.Read()
	if err != nil {
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
	rowNum := 1
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			slog.Error("Failed to read CSV row, skipping", "rowNum", rowNum)
			parseWarnings++
			rowNum++
			continue
		}
		dataRows = append(dataRows, row)
		rowNum++
	}

	if len(dataRows) < 100 {
		return CSVSchemaResult{}, fmt.Errorf("CSV file must contain at least 100 data rows (excluding header), found %d. Only files with 100 or more lines are supported", len(dataRows))
	}

	columnSchemas := make([]ColumnSchema, len(header))
	for i, colName := range header {
		columnSchemas[i] = ColumnSchema{
			Name: colName,
			Type: inferColumnType(dataRows, i),
		}
		if columnSchemas[i].Type == "bool" {
			columnSchemas[i].Values = collectBooleanValues(dataRows, i)
		}
	}

	return CSVSchemaResult{
		Columns:       columnSchemas,
		ParseWarnings: parseWarnings,
	}, nil
}

// validateAndNormalizeEndpoint validates the S3 endpoint URL to prevent SSRF attacks.
// Requires HTTPS and blocks private/reserved IP ranges.
func (c *RealS3Client) validateAndNormalizeEndpoint(endpoint string) (string, error) {
	if endpoint == "" {
		return "", fmt.Errorf("endpoint URL cannot be empty")
	}

	parsedURL, err := url.Parse(endpoint)
	if err != nil {
		return "", fmt.Errorf("invalid endpoint URL format: %w", err)
	}

	if parsedURL.Scheme != "https" {
		return "", fmt.Errorf("endpoint URL must use HTTPS scheme, got: %s", parsedURL.Scheme)
	}

	hostname := parsedURL.Hostname()
	if hostname == "" {
		return "", fmt.Errorf("endpoint URL must have a valid hostname")
	}

	ip := net.ParseIP(hostname)
	if ip != nil {
		if err := c.validateIPAddress(ip); err != nil {
			return "", err
		}
	} else {
		ips, err := net.LookupIP(hostname)
		if err != nil {
			allowUnresolved := c.options.DevMode && os.Getenv("ALLOW_UNRESOLVED_S3_ENDPOINTS") == "true"
			if allowUnresolved {
				slog.Warn("SECURITY: Bypassing DNS resolution check for S3 endpoint (dev mode). "+
					"This weakens SSRF protection and introduces TOCTOU risk. Do NOT use in production.",
					"hostname", hostname, "error", err.Error())
			} else {
				return "", fmt.Errorf("endpoint hostname '%s' cannot be resolved: %w (this may indicate a DNS rebinding attempt or misconfiguration)", hostname, err)
			}
		} else {
			for _, resolvedIP := range ips {
				if err := c.validateIPAddress(resolvedIP); err != nil {
					return "", fmt.Errorf("endpoint hostname '%s' resolves to blocked IP %s: %w", hostname, resolvedIP, err)
				}
			}
		}
	}

	return parsedURL.String(), nil
}

// validateIPAddress checks if an IP address is in a blocked range.
func (c *RealS3Client) validateIPAddress(ip net.IP) error {
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
			slog.Error("Failed to parse blocked CIDR", "cidr", blocked.cidr, "error", err)
			continue
		}
		if network.Contains(ip) {
			return fmt.Errorf("endpoint IP %s is in blocked %s", ip, blocked.description)
		}
	}

	return nil
}

// ---------------------------------------------------------------------------
// CSV helper functions
// ---------------------------------------------------------------------------

// normalizeLineEndings converts bare \r (old Mac-style) line endings to \n
// so that Go's csv.Reader can parse them. \r\n pairs are left intact.
func normalizeLineEndings(data []byte) []byte {
	// Fast path: if there are no \r bytes, nothing to do.
	if !bytes.ContainsRune(data, '\r') {
		return data
	}
	// First collapse \r\n → \n, then convert any remaining bare \r → \n.
	// Order matters: doing \r\n first prevents double-converting to \n\n.
	out := bytes.ReplaceAll(data, []byte("\r\n"), []byte("\n"))
	out = bytes.ReplaceAll(out, []byte("\r"), []byte("\n"))
	return out
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

func isNumber(s string) bool {
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}

func isInteger(s string) bool {
	f, err := strconv.ParseFloat(s, 64)
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
			if num, err := strconv.ParseFloat(value, 64); err == nil {
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

// extractFirstLine finds and returns the first complete line from the data.
// Used for initial validation of CSV content.
func extractFirstLine(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("no data to parse")
	}

	scanner := bufio.NewScanner(bytes.NewReader(data))

	scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
		if atEOF && len(data) == 0 {
			return 0, nil, nil
		}

		crlfPos := bytes.Index(data, []byte("\r\n"))
		lfPos := bytes.IndexByte(data, '\n')
		crPos := bytes.IndexByte(data, '\r')

		minPos := -1
		lineEndingLen := 0

		if crlfPos >= 0 {
			minPos = crlfPos
			lineEndingLen = 2
		}
		if lfPos >= 0 && (minPos < 0 || lfPos < minPos) {
			minPos = lfPos
			lineEndingLen = 1
		}
		if crPos >= 0 && (minPos < 0 || crPos < minPos) {
			minPos = crPos
			lineEndingLen = 1
		}

		if minPos >= 0 {
			return minPos + lineEndingLen, data[0:minPos], nil
		}

		if atEOF {
			return 0, nil, fmt.Errorf("CSV file must contain at least one complete line (no line ending found)")
		}
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

// countLines counts the number of lines in the data.
func countLines(data []byte) int {
	count := 0
	for i := 0; i < len(data); i++ {
		switch data[i] {
		case '\n':
			count++
		case '\r':
			if i+1 >= len(data) || data[i+1] != '\n' {
				count++
			}
		}
	}
	return count
}
