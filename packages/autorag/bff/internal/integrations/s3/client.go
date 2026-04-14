package s3

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// S3Credentials contains the credentials needed to connect to S3.
type S3Credentials struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	EndpointURL     string
	Bucket          string // Optional bucket name from secret (AWS_S3_BUCKET)
}

// ErrEndpointValidation is returned when the configured S3 endpoint fails URL or SSRF validation.
// Use errors.Is to classify CreateClient / NewRealS3Client failures.
var ErrEndpointValidation = errors.New("endpoint validation failed")

// ErrObjectAlreadyExists is returned by UploadObject when the object key already exists.
// Uploads use S3 conditional create (If-None-Match: *): 412 Precondition Failed or 409 ConditionalRequestConflict.
var ErrObjectAlreadyExists = errors.New("s3 object already exists at key")

// ListObjectsOptions contains parameters for listing S3 objects.
type ListObjectsOptions struct {
	Path   string // Denotes the current "folder" we should be searching in
	Search string // The value the user entered into the search bar
	Next   string // The token value to use if the user wants the next page
	Limit  int32  // Variable amount of max keys so we can paginate
}

// S3ClientInterface defines the interface for S3 operations.
type S3ClientInterface interface {
	GetObject(ctx context.Context, bucket, key string) (io.ReadCloser, string, error)
	UploadObject(ctx context.Context, bucket, key string, body io.Reader, contentType string) error
	ListObjects(ctx context.Context, bucket string, options ListObjectsOptions) (*models.S3ListObjectsResponse, error)
	ObjectExists(ctx context.Context, bucket, key string) (bool, error)
}

// RealS3Client implements S3ClientInterface using the AWS SDK.
type RealS3Client struct {
	s3Client *awss3.Client
	options  S3ClientOptions
}

// NewRealS3Client creates a new S3 client from credentials.
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

	// Clone the default transport to preserve connection pooling and set a
	// transport-level timeout unconditionally, regardless of TLS configuration.
	transport := cloneDefaultTransport()
	transport.ResponseHeaderTimeout = 30 * time.Second

	if c.options.RootCAs != nil {
		// Supply the custom CA pool so that self-signed or cluster-issued
		// certificates (e.g. MinIO) are verified against the operator-mounted
		// CA bundles rather than the system default.
		transport.TLSClientConfig = &tls.Config{
			RootCAs:    c.options.RootCAs,
			MinVersion: tls.VersionTLS12,
		}
	} else if c.options.DevMode {
		// In dev mode without CA bundles, skip TLS verification so developers
		// can test against clusters with self-signed certificates from their
		// local machine. In production the operator always provides CA bundles
		// via --bundle-paths, so this path is never reached.
		slog.Warn("S3 TLS certificate verification disabled (dev mode, no CA bundles provided)")
		transport.TLSClientConfig = &tls.Config{
			InsecureSkipVerify: true, //nolint:gosec // dev-mode only fallback
			MinVersion:         tls.VersionTLS12,
		}
	}

	cfg.HTTPClient = &http.Client{
		Transport: transport,
	}

	c.s3Client = awss3.NewFromConfig(cfg, func(o *awss3.Options) {
		o.BaseEndpoint = aws.String(validatedEndpoint)
		// Enable path-style addressing for S3-compatible services like MinIO
		o.UsePathStyle = true
	})

	return c, nil
}

// GetObject retrieves an object from S3 using transfer manager for optimized downloading
// and returns a reader for the content. Uses concurrent multipart downloads for large files.
func (c *RealS3Client) GetObject(ctx context.Context, bucket, key string) (io.ReadCloser, string, error) {
	// Create transfer manager for optimized downloads
	transferClient := transfermanager.New(c.s3Client)

	// Get the object using transfer manager
	// This automatically handles multipart downloads for large files with concurrency
	result, err := transferClient.GetObject(ctx, &transfermanager.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(o *transfermanager.Options) {
		o.Concurrency = c.options.Concurrency
		o.PartSizeBytes = c.options.PartSizeBytes
		o.GetObjectBufferSize = c.options.GetObjectBufSize
		o.PartBodyMaxRetries = c.options.PartBodyMaxRetries
	})
	if err != nil {
		return nil, "", fmt.Errorf("error retrieving object from S3: %w", err)
	}

	// Get content type, default to application/octet-stream if not specified
	contentType := "application/octet-stream"
	if result.ContentType != nil {
		contentType = *result.ContentType
	}

	// The transfer manager returns io.Reader; promote to io.ReadCloser so
	// callers can unconditionally Close the stream.
	body, ok := result.Body.(io.ReadCloser)
	if !ok {
		body = io.NopCloser(result.Body)
	}

	return body, contentType, nil
}

// UploadObject uploads an object to S3 using the transfer manager (same client/endpoint config as GetObject).
// Body is read until EOF and uploaded to the given bucket and key. contentType is optional (defaults to application/octet-stream).
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

// ListObjects retrieves a listing of objects from S3.
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

// cloneDefaultTransport returns a clone of http.DefaultTransport if it is an
// *http.Transport, or a fresh *http.Transport otherwise. This avoids a panic
// if DefaultTransport has been replaced with a non-standard implementation
// (e.g. in test environments).
func cloneDefaultTransport() *http.Transport {
	if t, ok := http.DefaultTransport.(*http.Transport); ok {
		return t.Clone()
	}
	return &http.Transport{}
}

// validateAndNormalizeEndpoint validates the S3 endpoint URL to prevent SSRF attacks.
//
// HTTPS is required — plain HTTP is rejected because S3 credentials would be
// transmitted in cleartext. Self-signed or cluster-issued certificates are
// supported via the RootCAs option (populated from operator-mounted CA bundles).
//
// RFC-1918 private IPs are permitted because MinIO commonly runs on the same
// cluster using service IPs (e.g. 10.x). Loopback, link-local, and reserved
// IP ranges are always blocked.
func (c *RealS3Client) validateAndNormalizeEndpoint(endpoint string) (string, error) {
	if endpoint == "" {
		return "", fmt.Errorf("endpoint URL cannot be empty")
	}

	// Parse the URL
	parsedURL, err := url.Parse(endpoint)
	if err != nil {
		return "", fmt.Errorf("invalid endpoint URL format: %w", err)
	}

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
		if err := c.validateIPAddress(ip); err != nil {
			return "", err
		}
	} else {
		// Hostname - resolve it and validate all IPs
		ips, err := net.LookupIP(hostname)
		if err != nil {
			// Only honor ALLOW_UNRESOLVED_S3_ENDPOINTS in dev mode to prevent
			// weakening SSRF protections in production.
			if c.options.DevMode && os.Getenv("ALLOW_UNRESOLVED_S3_ENDPOINTS") == "true" {
				slog.Warn("SECURITY: Bypassing DNS resolution check for S3 endpoint (dev mode). "+
					"This weakens SSRF protection and introduces TOCTOU risk. Do NOT use in production.",
					"hostname", hostname,
					"error", err.Error())
			} else {
				return "", fmt.Errorf("endpoint hostname '%s' cannot be resolved: %w (this may indicate a DNS rebinding attempt or misconfiguration)", hostname, err)
			}
		} else {
			// Validate all resolved IPs
			for _, resolvedIP := range ips {
				if err := c.validateIPAddress(resolvedIP); err != nil {
					return "", fmt.Errorf("endpoint hostname '%s' resolves to blocked IP %s: %w", hostname, resolvedIP, err)
				}
			}
		}
	}

	// Return the normalized URL string
	return parsedURL.String(), nil
}

// validateIPAddress checks if an IP address is in a blocked range.
//
// RFC-1918 private ranges (10/8, 172.16/12, 192.168/16), Carrier-Grade NAT
// (100.64/10, RFC 6598), and IPv6 unique local addresses (fc00::/7) are
// permitted because MinIO and other S3-compatible stores commonly run on the
// same cluster using service or pod IPs in these ranges.
// Loopback, link-local, and reserved ranges are always blocked to prevent
// SSRF targeting the node or cloud metadata services.
func (c *RealS3Client) validateIPAddress(ip net.IP) error {
	type blockedRange struct {
		cidr        string
		description string
	}

	blockedRanges := []blockedRange{
		{"0.0.0.0/8", "reserved 'this network' range (RFC 1122)"},
		{"169.254.0.0/16", "link-local range (169.254.0.0/16)"},
		{"127.0.0.0/8", "loopback range (127.0.0.0/8)"},
		{"240.0.0.0/4", "reserved for future use (RFC 1112)"},
		{"::1/128", "IPv6 loopback"},
		{"fe80::/10", "IPv6 link-local"},
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
