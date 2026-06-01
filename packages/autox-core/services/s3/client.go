package s3

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

const s3ConnectTimeout = 10 * time.Second

const (
	defaultTransferConcurrency      = 3
	defaultTransferPartSizeBytes    = 8 * 1024 * 1024 // 8 MB
	defaultTransferGetObjectBufSize = 256 * 1024      // 256 KB
	defaultTransferPartMaxRetries   = 3
)

// ConnectionOptions is the pure S3 connection configuration passed per-call.
// Bucket is not included — it is always an explicit operation parameter.
type ConnectionOptions struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	BaseEndpoint    string
}

// ClientConfig holds knobs for the default S3 client provider.
// No DevMode concept — callers decide what each knob means for their security posture.
type ClientConfig struct {
	Concurrency        int
	PartSizeBytes      int64
	GetObjectBufSize   int64
	PartBodyMaxRetries int

	// RootCAs overrides the system CA pool. Use for operator-mounted cluster CA bundles.
	RootCAs *x509.CertPool

	// InsecureSkipVerify disables TLS certificate verification.
	// Caller's responsibility to apply only in appropriate contexts.
	InsecureSkipVerify bool

	// AllowUnresolvedEndpoint skips DNS resolution checks in SSRF validation.
	// Caller's responsibility to guard this (e.g. only when a specific env var is set).
	AllowUnresolvedEndpoint bool

	// WrapTransport optionally wraps the HTTP transport chain after TLS is configured.
	// Use for port-forwarding, request tracing, or other transport-level concerns.
	WrapTransport func(http.RoundTripper) http.RoundTripper
}

// --- Provider interface ---

// ClientProvider creates AWS SDK objects from ConnectionOptions, enabling
// full mock substitution in tests without touching network or credentials.
type ClientProvider interface {
	CreateAPIClient(opts ConnectionOptions) (APIClient, error)
	CreateTransferClient(opts ConnectionOptions) (TransferClient, error)
}

// --- Low-level SDK interfaces (for provider-level testing) ---

// APIClient wraps the AWS SDK s3.Client methods used by this package.
type APIClient interface {
	HeadObject(ctx context.Context, params *awss3.HeadObjectInput, optFns ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error)
	ListObjectsV2(ctx context.Context, params *awss3.ListObjectsV2Input, optFns ...func(*awss3.Options)) (*awss3.ListObjectsV2Output, error)
	GetObject(ctx context.Context, params *awss3.GetObjectInput, optFns ...func(*awss3.Options)) (*awss3.GetObjectOutput, error)
}

// TransferClient wraps the transfer manager methods used by this package.
// The real implementation is *transfermanager.Client (returned by transfermanager.New).
type TransferClient interface {
	UploadObject(ctx context.Context, params *transfermanager.UploadObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error)
	GetObject(ctx context.Context, params *transfermanager.GetObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error)
}

// NewClient creates a client with an injectable provider (for testing).
func NewClient(provider ClientProvider) Client {
	return &client{Provider: provider}
}

// NewDefaultClient creates a client with the real AWS SDK provider.
func NewDefaultClient(cfg ClientConfig) Client {
	return &client{
		Provider: &awsClientProvider{cfg: cfg.withDefaults()},
	}
}

// --- client ---

// client implements Client using the Provider pattern.
// Each method creates fresh AWS SDK objects from the provider — no shared mutable state.
type client struct {
	Provider ClientProvider
}

func (c *client) GetObject(ctx context.Context, opts ConnectionOptions, input GetObjectInput) (io.ReadCloser, string, error) {
	apiClient, err := c.Provider.CreateAPIClient(opts)
	if err != nil {
		return nil, "", err
	}

	apiInput := &awss3.GetObjectInput{
		Bucket: aws.String(input.Bucket),
		Key:    aws.String(input.Key),
	}
	if input.Range != "" {
		apiInput.Range = aws.String(input.Range)
	}

	result, err := apiClient.GetObject(ctx, apiInput)
	if err != nil {
		if translated := translateS3Error(err); translated != nil {
			return nil, "", translated
		}
		return nil, "", fmt.Errorf("error retrieving object from S3: %w", err)
	}

	contentType := "application/octet-stream"
	if result.ContentType != nil {
		contentType = *result.ContentType
	}

	return result.Body, contentType, nil
}

func (c *client) DownloadObject(ctx context.Context, opts ConnectionOptions, input DownloadObjectInput) (io.ReadCloser, string, error) {
	transferClient, err := c.Provider.CreateTransferClient(opts)
	if err != nil {
		return nil, "", err
	}

	result, err := transferClient.GetObject(ctx, &transfermanager.GetObjectInput{
		Bucket: aws.String(input.Bucket),
		Key:    aws.String(input.Key),
	})
	if err != nil {
		if translated := translateS3Error(err); translated != nil {
			return nil, "", translated
		}
		return nil, "", fmt.Errorf("error downloading object from S3: %w", err)
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

func (c *client) UploadObject(ctx context.Context, opts ConnectionOptions, input UploadObjectInput) error {
	transferClient, err := c.Provider.CreateTransferClient(opts)
	if err != nil {
		return err
	}

	_, err = transferClient.UploadObject(ctx, &transfermanager.UploadObjectInput{
		Bucket:      aws.String(input.Bucket),
		Key:         aws.String(input.Key),
		Body:        input.Body,
		ContentType: aws.String(input.ContentType),
		IfNoneMatch: aws.String("*"),
	})
	if err != nil {
		if isS3ConditionalCreateConflict(err) {
			return ErrObjectAlreadyExists
		}
		if translated := translateS3Error(err); translated != nil {
			return translated
		}
		return fmt.Errorf("error uploading object to S3: %w", err)
	}
	return nil
}

func (c *client) ListObjects(ctx context.Context, opts ConnectionOptions, input ListObjectsInput) (*ListObjectsResponse, error) {
	apiClient, err := c.Provider.CreateAPIClient(opts)
	if err != nil {
		return nil, err
	}

	apiInput := &awss3.ListObjectsV2Input{
		Bucket:    aws.String(input.Bucket),
		Delimiter: aws.String(input.Delimiter),
		Prefix:    aws.String(input.Prefix),
		MaxKeys:   aws.Int32(input.Limit),
	}
	if input.ContinuationToken != "" {
		apiInput.ContinuationToken = aws.String(input.ContinuationToken)
	}

	output, err := apiClient.ListObjectsV2(ctx, apiInput)
	if err != nil {
		if translated := translateS3Error(err); translated != nil {
			return nil, translated
		}
		return nil, fmt.Errorf("error listing S3 objects: %w", err)
	}

	return mapListObjectsOutput(output), nil
}

func (c *client) ObjectExists(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error) {
	apiClient, err := c.Provider.CreateAPIClient(opts)
	if err != nil {
		return false, err
	}

	_, err = apiClient.HeadObject(ctx, &awss3.HeadObjectInput{
		Bucket: aws.String(input.Bucket),
		Key:    aws.String(input.Key),
	})
	if err == nil {
		return true, nil
	}

	if translated := translateS3Error(err); translated != nil {
		if errors.Is(translated, ErrObjectNotFound) {
			return false, nil
		}
		return false, translated
	}

	return false, fmt.Errorf("error checking object existence in S3: %w", err)
}

// --- awsClientProvider ---

// awsClientProvider is the real implementation of ClientProvider.
// It creates AWS SDK objects from ConnectionOptions with SSRF validation and TLS configuration.
type awsClientProvider struct {
	cfg ClientConfig
}

func (p *awsClientProvider) CreateAPIClient(opts ConnectionOptions) (APIClient, error) {
	return p.buildAWSClient(opts)
}

func (p *awsClientProvider) CreateTransferClient(opts ConnectionOptions) (TransferClient, error) {
	awsClient, err := p.buildAWSClient(opts)
	if err != nil {
		return nil, err
	}

	cfg := p.cfg
	return transfermanager.New(awsClient, func(o *transfermanager.Options) {
		o.Concurrency = cfg.Concurrency
		o.PartSizeBytes = cfg.PartSizeBytes
		o.GetObjectBufferSize = cfg.GetObjectBufSize
		o.PartBodyMaxRetries = cfg.PartBodyMaxRetries
		o.DisableChecksumValidation = false
	}), nil
}

// buildAWSClient creates a real *awss3.Client with validated endpoint, credentials, and TLS.
func (p *awsClientProvider) buildAWSClient(opts ConnectionOptions) (*awss3.Client, error) {
	validatedEndpoint, err := p.validateAndNormalizeEndpoint(opts.BaseEndpoint)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrEndpointValidation, err)
	}

	awsCfg := aws.Config{
		Region: opts.Region,
		Credentials: credentials.NewStaticCredentialsProvider(
			opts.AccessKeyID,
			opts.SecretAccessKey,
			"",
		),
		RetryMaxAttempts: 1,
		HTTPClient:       p.buildHTTPClient(),
	}

	return awss3.NewFromConfig(awsCfg, func(o *awss3.Options) {
		o.BaseEndpoint = aws.String(validatedEndpoint)
		o.UsePathStyle = true
	}), nil
}

// buildHTTPClient constructs the http.Client with TLS config and optional transport wrapping.
func (p *awsClientProvider) buildHTTPClient() *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.DialContext = (&net.Dialer{Timeout: s3ConnectTimeout}).DialContext
	transport.TLSHandshakeTimeout = s3ConnectTimeout
	transport.ResponseHeaderTimeout = 30 * time.Second

	if p.cfg.RootCAs != nil {
		transport.TLSClientConfig = &tls.Config{
			RootCAs:    p.cfg.RootCAs,
			MinVersion: tls.VersionTLS12,
		}
	} else if p.cfg.InsecureSkipVerify {
		transport.TLSClientConfig = &tls.Config{
			InsecureSkipVerify: true, //nolint:gosec // caller-controlled knob
			MinVersion:         tls.VersionTLS12,
		}
	}

	var rt http.RoundTripper = transport
	if p.cfg.WrapTransport != nil {
		rt = p.cfg.WrapTransport(rt)
	}

	return &http.Client{Transport: rt}
}

func (c ClientConfig) withDefaults() ClientConfig {
	if c.Concurrency == 0 {
		c.Concurrency = defaultTransferConcurrency
	}
	if c.PartSizeBytes == 0 {
		c.PartSizeBytes = defaultTransferPartSizeBytes
	}
	if c.GetObjectBufSize == 0 {
		c.GetObjectBufSize = defaultTransferGetObjectBufSize
	}
	if c.PartBodyMaxRetries == 0 {
		c.PartBodyMaxRetries = defaultTransferPartMaxRetries
	}
	return c
}

// translateS3Error maps AWS SDK typed errors to domain sentinel errors.
// Returns nil if the error has no domain translation (caller should wrap and return as-is).
func translateS3Error(err error) error {
	var noSuchKey *types.NoSuchKey
	var notFound *types.NotFound
	if errors.As(err, &noSuchKey) || errors.As(err, &notFound) {
		return ErrObjectNotFound
	}

	var noSuchBucket *types.NoSuchBucket
	if errors.As(err, &noSuchBucket) {
		return ErrBucketNotFound
	}

	var codedErr interface{ ErrorCode() string }
	if errors.As(err, &codedErr) {
		switch codedErr.ErrorCode() {
		case "NotFound", "NoSuchKey", "404":
			return ErrObjectNotFound
		case "NoSuchBucket":
			return ErrBucketNotFound
		case "AccessDenied":
			return ErrAccessDenied
		}
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

// Compile-time interface checks.
var _ Client = (*client)(nil)
var _ APIClient = (*awss3.Client)(nil)
var _ TransferClient = (*transfermanager.Client)(nil)
var _ ClientProvider = (*awsClientProvider)(nil)
