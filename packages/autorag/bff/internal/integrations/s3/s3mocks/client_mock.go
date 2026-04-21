package s3mocks

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"

	s3client "github.com/opendatahub-io/autorag-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// MockS3Client provides hardcoded S3 data for development without a real S3 backend.
type MockS3Client struct{}

// GetObject returns a placeholder text response.
// Binary file streaming is not yet mocked.
func (m *MockS3Client) GetObject(_ context.Context, bucket, key string) (io.ReadCloser, string, error) {
	content := fmt.Sprintf("[mock] contents of s3://%s/%s", bucket, key)
	return io.NopCloser(bytes.NewReader([]byte(content))), "text/plain", nil
}

// mockListingContainsKey reports whether key appears in the static mock object listings (HeadObject simulation).
func mockListingContainsKey(key string) bool {
	allPaths := []string{"", "datasets", "datasets/train", "results"}
	for _, path := range allPaths {
		objects, _ := getMockObjectsForPath(path)
		for _, object := range objects {
			if object.Key == key {
				return true
			}
		}
	}
	return false
}

// UploadObject mimics conditional create: fails if the key is already in the static listing; otherwise drains the body.
// io.Copy reports errors from reading body (e.g. *http.MaxBytesError on a limited reader).
func (m *MockS3Client) UploadObject(_ context.Context, _ string, key string, body io.Reader, _ string) error {
	if mockListingContainsKey(key) {
		return s3client.ErrObjectAlreadyExists
	}
	_, err := io.Copy(io.Discard, body)
	return err
}

// ObjectExists reports whether a key exists in the static mock listings.
func (m *MockS3Client) ObjectExists(_ context.Context, _ string, key string) (bool, error) {
	return mockListingContainsKey(key), nil
}

// ListObjects returns a realistic mock listing of S3 objects.
// Supports path-based navigation and pagination via options.
func (m *MockS3Client) ListObjects(_ context.Context, bucket string, options s3client.ListObjectsOptions) (*models.S3ListObjectsResponse, error) {
	allObjects, allPrefixes := getMockObjectsForPath(options.Path)

	// Apply search filter
	if options.Search != "" {
		allObjects, allPrefixes = applySearch(allObjects, allPrefixes, options.Path, options.Search)
	}

	// Apply pagination
	limit := options.Limit
	if limit <= 0 {
		limit = 1000
	}

	start := int32(0)
	if options.Next != "" {
		var parsed int32
		if _, err := fmt.Sscanf(options.Next, "%d", &parsed); err == nil && parsed > 0 {
			start = parsed
		}
	}

	totalObjects := int32(len(allObjects))
	if start > totalObjects {
		start = totalObjects
	}
	end := start + limit
	if end > totalObjects {
		end = totalObjects
	}

	pagedObjects := make([]models.S3ObjectInfo, 0)
	if start < totalObjects {
		pagedObjects = allObjects[start:end]
	}

	isTruncated := end < totalObjects
	nextToken := ""
	if isTruncated {
		nextToken = fmt.Sprintf("%d", end)
	}

	prefix := options.Search
	if options.Path != "" {
		path := options.Path
		if !strings.HasSuffix(path, "/") {
			path += "/"
		}
		prefix = path + options.Search
	}

	// Only include prefixes on the first page
	var responsePrefixes []models.S3CommonPrefix
	if start == 0 {
		responsePrefixes = allPrefixes
	}

	return &models.S3ListObjectsResponse{
		Name:                  bucket,
		Prefix:                prefix,
		Delimiter:             "/",
		MaxKeys:               limit,
		KeyCount:              int32(len(pagedObjects)) + int32(len(responsePrefixes)),
		IsTruncated:           isTruncated,
		NextContinuationToken: nextToken,
		CommonPrefixes:        responsePrefixes,
		Contents:              pagedObjects,
	}, nil
}

// getMockObjectsForPath returns mock objects and common prefixes for a given path.
func getMockObjectsForPath(path string) ([]models.S3ObjectInfo, []models.S3CommonPrefix) {
	if path != "" && !strings.HasSuffix(path, "/") {
		path += "/"
	}

	switch path {
	case "":
		return rootObjects(), rootPrefixes()
	case "datasets/":
		return datasetsObjects(), datasetsPrefixes()
	case "datasets/train/":
		return datasetsTrainObjects(), nil
	case "results/":
		return resultsObjects(), nil
	default:
		return nil, nil
	}
}

func rootPrefixes() []models.S3CommonPrefix {
	return []models.S3CommonPrefix{
		{Prefix: "datasets/"},
		{Prefix: "results/"},
		{Prefix: "configs/"},
	}
}

func rootObjects() []models.S3ObjectInfo {
	return []models.S3ObjectInfo{
		{Key: "README.md", Size: 2048, LastModified: "2026-03-01T10:00:00Z", ETag: `"d41d8cd98f00b204e9800998ecf8427e"`, StorageClass: "STANDARD"},
		{Key: "config.yaml", Size: 512, LastModified: "2026-03-05T14:30:00Z", ETag: `"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"`, StorageClass: "STANDARD"},
	}
}

func datasetsPrefixes() []models.S3CommonPrefix {
	return []models.S3CommonPrefix{
		{Prefix: "datasets/train/"},
		{Prefix: "datasets/eval/"},
	}
}

func datasetsObjects() []models.S3ObjectInfo {
	return []models.S3ObjectInfo{
		{Key: "datasets/metadata.json", Size: 1024, LastModified: "2026-03-10T08:00:00Z", ETag: `"b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7"`, StorageClass: "STANDARD"},
	}
}

func datasetsTrainObjects() []models.S3ObjectInfo {
	return []models.S3ObjectInfo{
		{Key: "datasets/train/questions.jsonl", Size: 524288, LastModified: "2026-03-10T09:00:00Z", ETag: `"c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8"`, StorageClass: "STANDARD"},
		{Key: "datasets/train/contexts.jsonl", Size: 1048576, LastModified: "2026-03-10T09:05:00Z", ETag: `"d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9"`, StorageClass: "STANDARD"},
		{Key: "datasets/train/answers.jsonl", Size: 262144, LastModified: "2026-03-10T09:10:00Z", ETag: `"e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"`, StorageClass: "STANDARD"},
	}
}

func resultsObjects() []models.S3ObjectInfo {
	return []models.S3ObjectInfo{
		{Key: "results/run-001-metrics.json", Size: 4096, LastModified: "2026-03-12T16:00:00Z", ETag: `"f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1"`, StorageClass: "STANDARD"},
		{Key: "results/run-002-metrics.json", Size: 4096, LastModified: "2026-03-13T11:30:00Z", ETag: `"a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2"`, StorageClass: "STANDARD"},
		{Key: "results/run-003-metrics.json", Size: 8192, LastModified: "2026-03-14T09:45:00Z", ETag: `"b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"`, StorageClass: "STANDARD"},
		{Key: "results/leaderboard.csv", Size: 2048, LastModified: "2026-03-15T10:00:00Z", ETag: `"c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4"`, StorageClass: "STANDARD"},
	}
}

// applySearch filters objects and prefixes by a search term within the given path.
func applySearch(
	objects []models.S3ObjectInfo,
	prefixes []models.S3CommonPrefix,
	path string,
	search string,
) ([]models.S3ObjectInfo, []models.S3CommonPrefix) {
	if path != "" && !strings.HasSuffix(path, "/") {
		path += "/"
	}
	fullPrefix := path + search

	filteredObjects := make([]models.S3ObjectInfo, 0)
	for _, obj := range objects {
		if strings.HasPrefix(obj.Key, fullPrefix) {
			filteredObjects = append(filteredObjects, obj)
		}
	}

	filteredPrefixes := make([]models.S3CommonPrefix, 0)
	for _, p := range prefixes {
		if strings.HasPrefix(p.Prefix, fullPrefix) {
			filteredPrefixes = append(filteredPrefixes, p)
		}
	}

	return filteredObjects, filteredPrefixes
}

// MockClientFactory creates mock S3 clients.
type MockClientFactory struct {
	mockClient s3client.S3ClientInterface
}

// Ensure MockClientFactory implements the interface
var _ s3client.S3ClientFactory = (*MockClientFactory)(nil)

// NewMockClientFactory creates a new mock client factory.
func NewMockClientFactory() *MockClientFactory {
	return &MockClientFactory{}
}

// SetMockClient sets a specific mock client to be returned by CreateClient.
func (f *MockClientFactory) SetMockClient(client s3client.S3ClientInterface) {
	f.mockClient = client
}

// CreateClient returns a mock S3 client, ignoring credentials.
func (f *MockClientFactory) CreateClient(_ *s3client.S3Credentials) (s3client.S3ClientInterface, error) {
	if f.mockClient != nil {
		return f.mockClient, nil
	}
	return &MockS3Client{}, nil
}
