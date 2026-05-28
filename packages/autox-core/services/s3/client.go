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

// S3ConnectionOptions is the pure S3 connection configuration passed per-call.
// Bucket is not included — it is always an explicit operation parameter.
type S3ConnectionOptions struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	BaseEndpoint    string
}

const s3ConnectTimeout = 10 * time.Second

// --- Low-level SDK interfaces (for provider-level testing) ---

// S3SDKClientInterface wraps the AWS SDK s3.Client methods used by this package.
type S3SDKClientInterface interface {
	HeadObject(ctx context.Context, params *awss3.HeadObjectInput, optFns ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error)
	ListObjectsV2(ctx context.Context, params *awss3.ListObjectsV2Input, optFns ...func(*awss3.Options)) (*awss3.ListObjectsV2Output, error)
	GetObject(ctx context.Context, params *awss3.GetObjectInput, optFns ...func(*awss3.Options)) (*awss3.GetObjectOutput, error)
}

// S3TransferManagerInterface wraps the transfer manager methods used by this package.
// The real implementation is *transfermanager.Client (returned by transfermanager.New).
type S3TransferManagerInterface interface {
	UploadObject(ctx context.Context, params *transfermanager.UploadObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error)
	GetObject(ctx context.Context, params *transfermanager.GetObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error)
}

// --- Provider interface ---

// S3ClientProviderInterface creates AWS SDK objects from S3ConnectionOptions, enabling
// full mock substitution in tests without touching network or credentials.
type S3ClientProviderInterface interface {
	CreateClient(opts S3ConnectionOptions) (S3SDKClientInterface, error)
	CreateTransferManager(opts S3ConnectionOptions) (S3TransferManagerInterface, error)
}

// --- High-level client interface ---

// S3ClientInterface defines the contract for S3 operations.
// Signatures: ctx, S3ConnectionOptions, then an operation-specific Input struct.
type S3ClientInterface interface {
	// GetObject uses the raw S3 SDK client. Supports the optional Range field in
	// GetObjectInput for efficient partial reads (e.g. schema inspection, first-N-bytes).
	GetObject(ctx context.Context, opts S3ConnectionOptions, input GetObjectInput) (io.ReadCloser, string, error)
	// DownloadObject uses the transfer manager for concurrent multipart download.
	// Preferred for large file downloads where parallelism improves throughput.
	DownloadObject(ctx context.Context, opts S3ConnectionOptions, input DownloadObjectInput) (io.ReadCloser, string, error)
	UploadObject(ctx context.Context, opts S3ConnectionOptions, input UploadObjectInput) error
	ListObjects(ctx context.Context, opts S3ConnectionOptions, input ListObjectsInput) (*S3ListObjectsResponse, error)
	ObjectExists(ctx context.Context, opts S3ConnectionOptions, input ObjectExistsInput) (bool, error)
}

// --- S3Client ---

// S3Client implements S3ClientInterface using the Provider pattern.
// Each method creates fresh AWS SDK objects from the provider — no shared mutable state.
type S3Client struct {
	Provider S3ClientProviderInterface
}

// NewS3Client creates an S3Client with an injectable provider (for testing).
func NewS3Client(provider S3ClientProviderInterface) *S3Client {
	return &S3Client{Provider: provider}
}

// NewDefaultS3Client creates an S3Client with the real AWS SDK provider.
func NewDefaultS3Client(cfg S3ClientConfig) *S3Client {
	return &S3Client{
		Provider: &S3ClientProvider{cfg: cfg.withDefaults()},
	}
}

func (c *S3Client) GetObject(ctx context.Context, opts S3ConnectionOptions, input GetObjectInput) (io.ReadCloser, string, error) {
	sdkClient, err := c.Provider.CreateClient(opts)
	if err != nil {
		return nil, "", err
	}

	sdkInput := &awss3.GetObjectInput{
		Bucket: aws.String(input.Bucket),
		Key:    aws.String(input.Key),
	}
	if input.Range != "" {
		sdkInput.Range = aws.String(input.Range)
	}

	result, err := sdkClient.GetObject(ctx, sdkInput)
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

func (c *S3Client) DownloadObject(ctx context.Context, opts S3ConnectionOptions, input DownloadObjectInput) (io.ReadCloser, string, error) {
	tm, err := c.Provider.CreateTransferManager(opts)
	if err != nil {
		return nil, "", err
	}

	result, err := tm.GetObject(ctx, &transfermanager.GetObjectInput{
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

func (c *S3Client) UploadObject(ctx context.Context, opts S3ConnectionOptions, input UploadObjectInput) error {
	tm, err := c.Provider.CreateTransferManager(opts)
	if err != nil {
		return err
	}

	_, err = tm.UploadObject(ctx, &transfermanager.UploadObjectInput{
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

func (c *S3Client) ListObjects(ctx context.Context, opts S3ConnectionOptions, input ListObjectsInput) (*S3ListObjectsResponse, error) {
	sdkClient, err := c.Provider.CreateClient(opts)
	if err != nil {
		return nil, err
	}

	sdkInput := &awss3.ListObjectsV2Input{
		Bucket:    aws.String(input.Bucket),
		Delimiter: aws.String(input.Delimiter),
		Prefix:    aws.String(input.Prefix),
		MaxKeys:   aws.Int32(input.Limit),
	}
	if input.ContinuationToken != "" {
		sdkInput.ContinuationToken = aws.String(input.ContinuationToken)
	}

	output, err := sdkClient.ListObjectsV2(ctx, sdkInput)
	if err != nil {
		if translated := translateS3Error(err); translated != nil {
			return nil, translated
		}
		return nil, fmt.Errorf("error listing S3 objects: %w", err)
	}

	return mapListObjectsOutput(output), nil
}

func (c *S3Client) ObjectExists(ctx context.Context, opts S3ConnectionOptions, input ObjectExistsInput) (bool, error) {
	sdkClient, err := c.Provider.CreateClient(opts)
	if err != nil {
		return false, err
	}

	_, err = sdkClient.HeadObject(ctx, &awss3.HeadObjectInput{
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

// Compile-time interface checks.
var _ S3ClientInterface = (*S3Client)(nil)
var _ S3SDKClientInterface = (*awss3.Client)(nil)
var _ S3TransferManagerInterface = (*transfermanager.Client)(nil)

// --- S3ClientConfig ---

// S3ClientConfig holds knobs for the default S3 client provider.
// No DevMode concept — callers decide what each knob means for their security posture.
type S3ClientConfig struct {
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

const (
	defaultTransferConcurrency      = 3
	defaultTransferPartSizeBytes    = 8 * 1024 * 1024 // 8 MB
	defaultTransferGetObjectBufSize = 256 * 1024      // 256 KB
	defaultTransferPartMaxRetries   = 3
)

func (c S3ClientConfig) withDefaults() S3ClientConfig {
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

// --- S3ClientProvider ---

// S3ClientProvider is the real implementation of S3ClientProviderInterface.
// It creates AWS SDK objects from S3ConnectionOptions with SSRF validation and TLS configuration.
type S3ClientProvider struct {
	cfg S3ClientConfig
}

func (p *S3ClientProvider) CreateClient(opts S3ConnectionOptions) (S3SDKClientInterface, error) {
	return p.buildAWSClient(opts)
}

func (p *S3ClientProvider) CreateTransferManager(opts S3ConnectionOptions) (S3TransferManagerInterface, error) {
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
func (p *S3ClientProvider) buildAWSClient(opts S3ConnectionOptions) (*awss3.Client, error) {
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
func (p *S3ClientProvider) buildHTTPClient() *http.Client {
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

// Compile-time check that S3ClientProvider satisfies S3ClientProviderInterface.
var _ S3ClientProviderInterface = (*S3ClientProvider)(nil)

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
