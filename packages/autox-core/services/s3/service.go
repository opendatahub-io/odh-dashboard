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

// S3Service provides business logic for S3 operations.
// It is intentionally thin — no K8s coupling, no DSPA coupling, no credential extraction.
// Orchestration (K8s secret lookup → S3ConnectionOptions → S3 operation) is the caller's responsibility.
type S3Service struct {
	Client S3ClientInterface
	Logger *slog.Logger
}

// S3ServiceConfig holds configuration for creating an S3Service.
type S3ServiceConfig struct {
	Logger *slog.Logger
}

// NewS3Service creates an S3Service with the given client and config.
func NewS3Service(cfg S3ServiceConfig, client S3ClientInterface) *S3Service {
	return &S3Service{
		Client: client,
		Logger: cfg.Logger,
	}
}

// GetObject retrieves an object from S3 and returns a read-closer and content type.
// The caller is responsible for closing the returned body.
func (s *S3Service) GetObject(ctx context.Context, opts S3ConnectionOptions, bucket, key string) (io.ReadCloser, string, error) {
	s.Logger.Info("getting S3 object", "bucket", bucket, "key", key)

	body, contentType, err := s.Client.GetObject(ctx, opts, bucket, key)
	if err != nil {
		s.Logger.Error("failed to get S3 object", "bucket", bucket, "key", key, "error", err)
		return nil, "", err
	}

	return body, contentType, nil
}

// UploadObject uploads body to the given bucket and key with the specified content type.
// Returns ErrObjectAlreadyExists if the key already exists (conditional create enforcement).
func (s *S3Service) UploadObject(ctx context.Context, opts S3ConnectionOptions, bucket, key string, body io.Reader, contentType string) error {
	s.Logger.Info("uploading S3 object", "bucket", bucket, "key", key)

	if err := s.Client.UploadObject(ctx, opts, bucket, key, body, contentType); err != nil {
		s.Logger.Error("failed to upload S3 object", "bucket", bucket, "key", key, "error", err)
		return err
	}

	return nil
}

// ListObjects lists objects in the bucket using the given options for path, search, and pagination.
func (s *S3Service) ListObjects(ctx context.Context, opts S3ConnectionOptions, bucket string, options ListObjectsOptions) (*S3ListObjectsResponse, error) {
	s.Logger.Info("listing S3 objects", "bucket", bucket, "path", options.Path, "search", options.Search)

	result, err := s.Client.ListObjects(ctx, opts, bucket, buildListPrefix(options), "/", options.Limit, options.Next)
	if err != nil {
		s.Logger.Error("failed to list S3 objects", "bucket", bucket, "error", err)
		return nil, err
	}

	return result, nil
}

// ObjectExists checks whether an object key already exists in the given bucket.
func (s *S3Service) ObjectExists(ctx context.Context, opts S3ConnectionOptions, bucket, key string) (bool, error) {
	s.Logger.Info("checking S3 object existence", "bucket", bucket, "key", key)

	exists, err := s.Client.ObjectExists(ctx, opts, bucket, key)
	if err != nil {
		s.Logger.Error("failed to check S3 object existence", "bucket", bucket, "key", key, "error", err)
		return false, err
	}

	return exists, nil
}

// ResolveNonCollidingKey finds an available object key in bucket, starting with key and
// appending -1, -2, … up to maxAttempts when the key already exists.
// Returns ErrMaxCollisionsExceeded if all attempts find an occupied key.
func (s *S3Service) ResolveNonCollidingKey(ctx context.Context, opts S3ConnectionOptions, bucket, key string, maxAttempts int) (string, error) {
	exists, err := s.Client.ObjectExists(ctx, opts, bucket, key)
	if err != nil {
		return "", err
	}
	if !exists {
		return key, nil
	}

	dir, name := splitS3ObjectPath(key)
	stem, ext := splitNameAndExtension(name)
	base, nextIndex := splitStemAndNextIndex(stem)

	for range maxAttempts {
		candidate := dir + fmt.Sprintf("%s-%d%s", base, nextIndex, ext)

		exists, err = s.Client.ObjectExists(ctx, opts, bucket, candidate)
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

var trailingNumberSuffixPattern = regexp.MustCompile(`^(.*)-(\d+)$`)

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

// buildListPrefix constructs the S3 Prefix parameter from ListObjectsOptions.
// Path acts as the current virtual folder; Search is appended as a key filter within it.
func buildListPrefix(options ListObjectsOptions) string {
	if options.Path == "" {
		return options.Search
	}
	path := options.Path
	if !strings.HasSuffix(path, "/") {
		path += "/"
	}
	return path + options.Search
}
