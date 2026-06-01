package mocks

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"slices"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	awss3types "github.com/aws/aws-sdk-go-v2/service/s3/types"

	s3svc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// MockClient implements s3svc.Client with hardcoded data for development
// and testing without a real S3 backend.
type MockClient struct{}

// mockStaticListingKeys are the pre-existing keys used by ListObjects and ObjectExists.
// UploadObject fails with ErrObjectAlreadyExists for these keys (conditional create simulation).
var mockStaticListingKeys = []string{
	"datasets/train.csv",
	"datasets/test.csv",
	"datasets/validation.csv",
	"results/model.pkl",
	"results/metrics.json",
	"configs/pipeline.yaml",
}

func (m *MockClient) GetObject(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.GetObjectInput) (io.ReadCloser, string, error) {
	if strings.Contains(input.Key, "non-existent") {
		return nil, "", &awss3types.NoSuchKey{}
	}
	if strings.HasSuffix(input.Key, ".pdf") {
		content := []byte("%PDF-1.4\n%Mock PDF file for testing\n%%EOF")
		return io.NopCloser(bytes.NewReader(content)), "application/pdf", nil
	}
	content := []byte(fmt.Sprintf("[mock] contents of s3 object at key: %s", input.Key))
	return io.NopCloser(bytes.NewReader(content)), "application/octet-stream", nil
}

func (m *MockClient) DownloadObject(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.DownloadObjectInput) (io.ReadCloser, string, error) {
	content := []byte(fmt.Sprintf("[mock download] s3 object at key: %s", input.Key))
	return io.NopCloser(bytes.NewReader(content)), "application/octet-stream", nil
}

func (m *MockClient) UploadObject(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.UploadObjectInput) error {
	if slices.Contains(mockStaticListingKeys, input.Key) {
		return s3svc.ErrObjectAlreadyExists
	}
	// Drain the body to simulate upload (catches MaxBytesError from limited readers).
	_, err := io.Copy(io.Discard, input.Body)
	return err
}

func (m *MockClient) ListObjects(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.ListObjectsInput) (*s3svc.ListObjectsResponse, error) {
	bucket, prefix, limit := input.Bucket, input.Prefix, input.Limit
	allObjects := []s3svc.ObjectInfo{
		{Key: "datasets/train.csv", Size: 204800, ETag: "abc1", StorageClass: "STANDARD", LastModified: "2024-01-15T10:00:00Z"},
		{Key: "datasets/test.csv", Size: 51200, ETag: "abc2", StorageClass: "STANDARD", LastModified: "2024-01-15T10:01:00Z"},
		{Key: "datasets/validation.csv", Size: 25600, ETag: "abc3", StorageClass: "STANDARD", LastModified: "2024-01-15T10:02:00Z"},
		{Key: "results/model.pkl", Size: 1048576, ETag: "def1", StorageClass: "STANDARD", LastModified: "2024-01-16T12:00:00Z"},
		{Key: "results/metrics.json", Size: 1024, ETag: "def2", StorageClass: "STANDARD", LastModified: "2024-01-16T12:01:00Z"},
		{Key: "configs/pipeline.yaml", Size: 2048, ETag: "ghi1", StorageClass: "STANDARD", LastModified: "2024-01-14T09:00:00Z"},
	}

	var filtered []s3svc.ObjectInfo
	for _, obj := range allObjects {
		if strings.HasPrefix(obj.Key, prefix) {
			filtered = append(filtered, obj)
		}
	}

	if limit <= 0 {
		limit = 1000
	}
	if int(limit) < len(filtered) {
		filtered = filtered[:limit]
	}
	if filtered == nil {
		filtered = []s3svc.ObjectInfo{}
	}

	return &s3svc.ListObjectsResponse{
		IsTruncated:    false,
		KeyCount:       int32(len(filtered)),
		MaxKeys:        limit,
		Name:           bucket,
		Prefix:         prefix,
		Delimiter:      "/",
		CommonPrefixes: []s3svc.CommonPrefix{},
		Contents:       filtered,
	}, nil
}

func (m *MockClient) ObjectExists(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.ObjectExistsInput) (bool, error) {
	return slices.Contains(mockStaticListingKeys, input.Key), nil
}

// Compile-time check.
var _ s3svc.Client = (*MockClient)(nil)

// --- MockClientProvider ---

// MockClientProvider provides a mock SDK provider for testing the client layer
// without real AWS SDK calls. It returns MockAPIClient and MockTransferClient instances.
type MockClientProvider struct {
	// APIClientFunc optionally overrides CreateAPIClient. If nil, returns MockAPIClient.
	APIClientFunc func(opts s3svc.ConnectionOptions) (s3svc.APIClient, error)
	// TransferClientFunc optionally overrides CreateTransferClient. If nil, returns MockTransferClient.
	TransferClientFunc func(opts s3svc.ConnectionOptions) (s3svc.TransferClient, error)
}

func (p *MockClientProvider) CreateAPIClient(opts s3svc.ConnectionOptions) (s3svc.APIClient, error) {
	if p.APIClientFunc != nil {
		return p.APIClientFunc(opts)
	}
	return &MockAPIClient{}, nil
}

func (p *MockClientProvider) CreateTransferClient(opts s3svc.ConnectionOptions) (s3svc.TransferClient, error) {
	if p.TransferClientFunc != nil {
		return p.TransferClientFunc(opts)
	}
	return &MockTransferClient{}, nil
}

// Compile-time check.
var _ s3svc.ClientProvider = (*MockClientProvider)(nil)

// --- MockAPIClient ---

// MockAPIClient implements s3svc.APIClient for testing.
type MockAPIClient struct {
	HeadObjectFunc    func(ctx context.Context, params *awss3.HeadObjectInput, optFns ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error)
	ListObjectsV2Func func(ctx context.Context, params *awss3.ListObjectsV2Input, optFns ...func(*awss3.Options)) (*awss3.ListObjectsV2Output, error)
	GetObjectFunc     func(ctx context.Context, params *awss3.GetObjectInput, optFns ...func(*awss3.Options)) (*awss3.GetObjectOutput, error)
}

func (m *MockAPIClient) HeadObject(ctx context.Context, params *awss3.HeadObjectInput, optFns ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error) {
	if m.HeadObjectFunc != nil {
		return m.HeadObjectFunc(ctx, params, optFns...)
	}
	return &awss3.HeadObjectOutput{}, nil
}

func (m *MockAPIClient) ListObjectsV2(ctx context.Context, params *awss3.ListObjectsV2Input, optFns ...func(*awss3.Options)) (*awss3.ListObjectsV2Output, error) {
	if m.ListObjectsV2Func != nil {
		return m.ListObjectsV2Func(ctx, params, optFns...)
	}
	return &awss3.ListObjectsV2Output{
		CommonPrefixes: []awss3types.CommonPrefix{},
		Contents:       []awss3types.Object{},
		IsTruncated:    aws.Bool(false),
		KeyCount:       aws.Int32(0),
		MaxKeys:        aws.Int32(1000),
		Name:           params.Bucket,
		Prefix:         params.Prefix,
		Delimiter:      params.Delimiter,
	}, nil
}

func (m *MockAPIClient) GetObject(ctx context.Context, params *awss3.GetObjectInput, optFns ...func(*awss3.Options)) (*awss3.GetObjectOutput, error) {
	if m.GetObjectFunc != nil {
		return m.GetObjectFunc(ctx, params, optFns...)
	}
	now := time.Now()
	content := fmt.Sprintf("[mock SDK] s3://%s/%s", aws.ToString(params.Bucket), aws.ToString(params.Key))
	return &awss3.GetObjectOutput{
		Body:          io.NopCloser(strings.NewReader(content)),
		ContentType:   aws.String("application/octet-stream"),
		ContentLength: aws.Int64(int64(len(content))),
		LastModified:  &now,
	}, nil
}

// Compile-time check.
var _ s3svc.APIClient = (*MockAPIClient)(nil)

// --- MockTransferClient ---

// MockTransferClient implements s3svc.TransferClient for testing.
type MockTransferClient struct {
	UploadObjectFunc func(ctx context.Context, params *transfermanager.UploadObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error)
	GetObjectFunc    func(ctx context.Context, params *transfermanager.GetObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error)
}

func (m *MockTransferClient) UploadObject(ctx context.Context, params *transfermanager.UploadObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error) {
	if m.UploadObjectFunc != nil {
		return m.UploadObjectFunc(ctx, params, optFns...)
	}
	// Drain body to simulate upload.
	_, _ = io.Copy(io.Discard, params.Body)
	return &transfermanager.UploadObjectOutput{}, nil
}

func (m *MockTransferClient) GetObject(ctx context.Context, params *transfermanager.GetObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error) {
	if m.GetObjectFunc != nil {
		return m.GetObjectFunc(ctx, params, optFns...)
	}
	key := aws.ToString(params.Key)
	content := fmt.Sprintf("[mock transfer] key: %s", key)
	return &transfermanager.GetObjectOutput{
		Body:        io.NopCloser(strings.NewReader(content)),
		ContentType: aws.String("application/octet-stream"),
	}, nil
}

// Compile-time check.
var _ s3svc.TransferClient = (*MockTransferClient)(nil)
