package s3

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"path"
	"regexp"
	"strconv"
	"strings"
)

var trailingNumberSuffixPattern = regexp.MustCompile(`^(.*)-(\d+)$`)

// Service defines the public contract for the S3 service layer.
// Consumers should depend on this interface to enable mock substitution in tests.
type Service interface {
	GetObject(ctx context.Context, opts ConnectionOptions, input GetObjectInput) (io.ReadCloser, string, error)
	DownloadObject(ctx context.Context, opts ConnectionOptions, input DownloadObjectInput) (io.ReadCloser, string, error)
	UploadObject(ctx context.Context, opts ConnectionOptions, input UploadObjectInput) error
	ListObjects(ctx context.Context, opts ConnectionOptions, query ListObjectsQuery) (*ListObjectsResponse, error)
	ObjectExists(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error)
	ResolveNonCollidingKey(ctx context.Context, opts ConnectionOptions, input ResolveNonCollidingKeyInput) (string, error)
}

// Client defines the contract for S3 operations.
// Signatures: ctx, ConnectionOptions, then an operation-specific Input struct.
type Client interface {
	// GetObject uses the raw S3 SDK client. Supports the optional Range field in
	// GetObjectInput for efficient partial reads (e.g. schema inspection, first-N-bytes).
	GetObject(ctx context.Context, opts ConnectionOptions, input GetObjectInput) (io.ReadCloser, string, error)
	// DownloadObject uses the transfer manager for concurrent multipart download.
	// Preferred for large file downloads where parallelism improves throughput.
	DownloadObject(ctx context.Context, opts ConnectionOptions, input DownloadObjectInput) (io.ReadCloser, string, error)
	UploadObject(ctx context.Context, opts ConnectionOptions, input UploadObjectInput) error
	ListObjects(ctx context.Context, opts ConnectionOptions, input ListObjectsInput) (*ListObjectsResponse, error)
	ObjectExists(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error)
}

// ServiceConfig holds configuration for creating a Service.
type ServiceConfig struct {
	Logger *slog.Logger
}

type service struct {
	Client Client
	Logger *slog.Logger
}

// Compile-time interface check.
var _ Service = (*service)(nil)

func NewService(cfg ServiceConfig, client Client) Service {
	return &service{
		Client: client,
		Logger: cfg.Logger,
	}
}

// GetObject uses the raw S3 SDK client. Supports the optional Range field in
// GetObjectInput for efficient partial reads (e.g. CSV schema inspection).
// The caller is responsible for closing the returned body.
func (s *service) GetObject(ctx context.Context, opts ConnectionOptions, input GetObjectInput) (io.ReadCloser, string, error) {
	s.Logger.Info("getting S3 object", "bucket", input.Bucket, "key", input.Key)

	body, contentType, err := s.Client.GetObject(ctx, opts, input)
	if err != nil {
		s.Logger.Error("failed to get S3 object", "bucket", input.Bucket, "key", input.Key, "error", err)
		return nil, "", err
	}

	return body, contentType, nil
}

// DownloadObject uses the transfer manager for concurrent multipart download.
// Preferred for large file downloads where parallelism improves throughput.
// The caller is responsible for closing the returned body.
func (s *service) DownloadObject(ctx context.Context, opts ConnectionOptions, input DownloadObjectInput) (io.ReadCloser, string, error) {
	s.Logger.Info("downloading S3 object", "bucket", input.Bucket, "key", input.Key)

	body, contentType, err := s.Client.DownloadObject(ctx, opts, input)
	if err != nil {
		s.Logger.Error("failed to download S3 object", "bucket", input.Bucket, "key", input.Key, "error", err)
		return nil, "", err
	}

	return body, contentType, nil
}

// UploadObject uploads body to the given bucket and key with the specified content type.
// Returns ErrObjectAlreadyExists if the key already exists (conditional create enforcement).
func (s *service) UploadObject(ctx context.Context, opts ConnectionOptions, input UploadObjectInput) error {
	s.Logger.Info("uploading S3 object", "bucket", input.Bucket, "key", input.Key)

	if err := s.Client.UploadObject(ctx, opts, input); err != nil {
		s.Logger.Error("failed to upload S3 object", "bucket", input.Bucket, "key", input.Key, "error", err)
		return err
	}

	return nil
}

// ListObjects lists objects using the given query. Path and Search are translated into
// a raw S3 Prefix before calling the client.
func (s *service) ListObjects(ctx context.Context, opts ConnectionOptions, query ListObjectsQuery) (*ListObjectsResponse, error) {
	s.Logger.Info("listing S3 objects", "bucket", query.Bucket, "path", query.Path, "search", query.Search)

	result, err := s.Client.ListObjects(ctx, opts, ListObjectsInput{
		Bucket:            query.Bucket,
		Prefix:            buildListPrefix(query),
		Delimiter:         "/",
		Limit:             query.Limit,
		ContinuationToken: query.Next,
	})
	if err != nil {
		s.Logger.Error("failed to list S3 objects", "bucket", query.Bucket, "error", err)
		return nil, err
	}

	return result, nil
}

// ObjectExists checks whether an object key already exists in the given bucket.
func (s *service) ObjectExists(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error) {
	s.Logger.Info("checking S3 object existence", "bucket", input.Bucket, "key", input.Key)

	exists, err := s.Client.ObjectExists(ctx, opts, input)
	if err != nil {
		s.Logger.Error("failed to check S3 object existence", "bucket", input.Bucket, "key", input.Key, "error", err)
		return false, err
	}

	return exists, nil
}

// ResolveNonCollidingKey finds an available object key, starting with input.Key and
// appending -1, -2, … up to input.MaxAttempts when the key already exists.
// Returns ErrMaxCollisionsExceeded if all attempts find an occupied key.
func (s *service) ResolveNonCollidingKey(ctx context.Context, opts ConnectionOptions, input ResolveNonCollidingKeyInput) (string, error) {
	exists, err := s.Client.ObjectExists(ctx, opts, ObjectExistsInput{Bucket: input.Bucket, Key: input.Key})
	if err != nil {
		return "", err
	}
	if !exists {
		return input.Key, nil
	}

	dir, name := splitS3ObjectPath(input.Key)
	stem, ext := splitNameAndExtension(name)
	base, nextIndex := splitStemAndNextIndex(stem)

	for range input.MaxAttempts {
		candidate := dir + fmt.Sprintf("%s-%d%s", base, nextIndex, ext)

		exists, err = s.Client.ObjectExists(ctx, opts, ObjectExistsInput{Bucket: input.Bucket, Key: candidate})
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
		nextIndex++
	}

	return "", ErrMaxCollisionsExceeded
}

func splitS3ObjectPath(key string) (dir, name string) {
	i := strings.LastIndex(key, "/")
	if i == -1 {
		return "", key
	}
	return key[:i+1], key[i+1:]
}

func splitNameAndExtension(filename string) (stem, ext string) {
	ext = path.Ext(filename)
	if ext == "" {
		return filename, ""
	}
	stem = strings.TrimSuffix(filename, ext)
	if stem == "" {
		return filename, ""
	}
	return stem, ext
}

func splitStemAndNextIndex(stem string) (base string, nextIndex int) {
	match := trailingNumberSuffixPattern.FindStringSubmatch(stem)
	if len(match) != 3 {
		return stem, 1
	}
	n, err := strconv.Atoi(match[2])
	if err != nil {
		return stem, 1
	}
	return match[1], n + 1
}

// buildListPrefix constructs the S3 Prefix parameter from a ListObjectsQuery.
// Path acts as the current virtual folder; Search is appended as a key filter within it.
func buildListPrefix(query ListObjectsQuery) string {
	if query.Path == "" {
		return query.Search
	}
	p := query.Path
	if !strings.HasSuffix(p, "/") {
		p += "/"
	}
	return p + query.Search
}
