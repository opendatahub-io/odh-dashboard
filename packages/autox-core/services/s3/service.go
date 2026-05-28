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

// GetObject uses the raw S3 SDK client. Supports the optional Range field in
// GetObjectInput for efficient partial reads (e.g. CSV schema inspection).
// The caller is responsible for closing the returned body.
func (s *S3Service) GetObject(ctx context.Context, opts S3ConnectionOptions, input GetObjectInput) (io.ReadCloser, string, error) {
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
func (s *S3Service) DownloadObject(ctx context.Context, opts S3ConnectionOptions, input DownloadObjectInput) (io.ReadCloser, string, error) {
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
func (s *S3Service) UploadObject(ctx context.Context, opts S3ConnectionOptions, input UploadObjectInput) error {
	s.Logger.Info("uploading S3 object", "bucket", input.Bucket, "key", input.Key)

	if err := s.Client.UploadObject(ctx, opts, input); err != nil {
		s.Logger.Error("failed to upload S3 object", "bucket", input.Bucket, "key", input.Key, "error", err)
		return err
	}

	return nil
}

// ListObjects lists objects using the given query. Path and Search are translated into
// a raw S3 Prefix before calling the client.
func (s *S3Service) ListObjects(ctx context.Context, opts S3ConnectionOptions, query ListObjectsQuery) (*S3ListObjectsResponse, error) {
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
func (s *S3Service) ObjectExists(ctx context.Context, opts S3ConnectionOptions, input ObjectExistsInput) (bool, error) {
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
func (s *S3Service) ResolveNonCollidingKey(ctx context.Context, opts S3ConnectionOptions, input ResolveNonCollidingKeyInput) (string, error) {
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
