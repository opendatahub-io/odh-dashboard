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

// MockS3Client implements s3svc.S3ClientInterface with hardcoded data for development
// and testing without a real S3 backend.
type MockS3Client struct{}

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

func (m *MockS3Client) GetObject(_ context.Context, _ s3svc.S3ConnectionOptions, input s3svc.GetObjectInput) (io.ReadCloser, string, error) {
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

func (m *MockS3Client) UploadObject(_ context.Context, _ s3svc.S3ConnectionOptions, input s3svc.UploadObjectInput) error {
	if slices.Contains(mockStaticListingKeys, input.Key) {
		return s3svc.ErrObjectAlreadyExists
	}
	// Drain the body to simulate upload (catches MaxBytesError from limited readers).
	_, err := io.Copy(io.Discard, input.Body)
	return err
}

func (m *MockS3Client) ListObjects(_ context.Context, _ s3svc.S3ConnectionOptions, input s3svc.ListObjectsInput) (*s3svc.S3ListObjectsResponse, error) {
	bucket, prefix, limit := input.Bucket, input.Prefix, input.Limit
	allObjects := []s3svc.S3ObjectInfo{
		{Key: "datasets/train.csv", Size: 204800, ETag: "abc1", StorageClass: "STANDARD", LastModified: "2024-01-15T10:00:00Z"},
		{Key: "datasets/test.csv", Size: 51200, ETag: "abc2", StorageClass: "STANDARD", LastModified: "2024-01-15T10:01:00Z"},
		{Key: "datasets/validation.csv", Size: 25600, ETag: "abc3", StorageClass: "STANDARD", LastModified: "2024-01-15T10:02:00Z"},
		{Key: "results/model.pkl", Size: 1048576, ETag: "def1", StorageClass: "STANDARD", LastModified: "2024-01-16T12:00:00Z"},
		{Key: "results/metrics.json", Size: 1024, ETag: "def2", StorageClass: "STANDARD", LastModified: "2024-01-16T12:01:00Z"},
		{Key: "configs/pipeline.yaml", Size: 2048, ETag: "ghi1", StorageClass: "STANDARD", LastModified: "2024-01-14T09:00:00Z"},
	}

	var filtered []s3svc.S3ObjectInfo
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
		filtered = []s3svc.S3ObjectInfo{}
	}

	return &s3svc.S3ListObjectsResponse{
		IsTruncated:    false,
		KeyCount:       int32(len(filtered)),
		MaxKeys:        limit,
		Name:           bucket,
		Prefix:         prefix,
		Delimiter:      "/",
		CommonPrefixes: []s3svc.S3CommonPrefix{},
		Contents:       filtered,
	}, nil
}

func (m *MockS3Client) ObjectExists(_ context.Context, _ s3svc.S3ConnectionOptions, input s3svc.ObjectExistsInput) (bool, error) {
	return slices.Contains(mockStaticListingKeys, input.Key), nil
}

// Compile-time check.
var _ s3svc.S3ClientInterface = (*MockS3Client)(nil)

// --- MockS3Provider ---

// MockS3Provider implements s3svc.S3ClientProviderInterface for testing the client layer
// without real AWS SDK calls. It returns MockSDKClient and MockTransferManager instances.
type MockS3Provider struct {
	// SDKClientFunc optionally overrides CreateClient. If nil, returns MockSDKClient.
	SDKClientFunc func(opts s3svc.S3ConnectionOptions) (s3svc.S3SDKClientInterface, error)
	// TransferManagerFunc optionally overrides CreateTransferManager. If nil, returns MockTransferManager.
	TransferManagerFunc func(opts s3svc.S3ConnectionOptions) (s3svc.S3TransferManagerInterface, error)
}

func (p *MockS3Provider) CreateClient(opts s3svc.S3ConnectionOptions) (s3svc.S3SDKClientInterface, error) {
	if p.SDKClientFunc != nil {
		return p.SDKClientFunc(opts)
	}
	return &MockSDKClient{}, nil
}

func (p *MockS3Provider) CreateTransferManager(opts s3svc.S3ConnectionOptions) (s3svc.S3TransferManagerInterface, error) {
	if p.TransferManagerFunc != nil {
		return p.TransferManagerFunc(opts)
	}
	return &MockTransferManager{}, nil
}

// Compile-time check.
var _ s3svc.S3ClientProviderInterface = (*MockS3Provider)(nil)

// --- MockSDKClient ---

// MockSDKClient implements s3svc.S3SDKClientInterface for testing.
type MockSDKClient struct {
	HeadObjectFunc    func(ctx context.Context, params *awss3.HeadObjectInput, optFns ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error)
	ListObjectsV2Func func(ctx context.Context, params *awss3.ListObjectsV2Input, optFns ...func(*awss3.Options)) (*awss3.ListObjectsV2Output, error)
	GetObjectFunc     func(ctx context.Context, params *awss3.GetObjectInput, optFns ...func(*awss3.Options)) (*awss3.GetObjectOutput, error)
}

func (m *MockSDKClient) HeadObject(ctx context.Context, params *awss3.HeadObjectInput, optFns ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error) {
	if m.HeadObjectFunc != nil {
		return m.HeadObjectFunc(ctx, params, optFns...)
	}
	return &awss3.HeadObjectOutput{}, nil
}

func (m *MockSDKClient) ListObjectsV2(ctx context.Context, params *awss3.ListObjectsV2Input, optFns ...func(*awss3.Options)) (*awss3.ListObjectsV2Output, error) {
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

func (m *MockSDKClient) GetObject(ctx context.Context, params *awss3.GetObjectInput, optFns ...func(*awss3.Options)) (*awss3.GetObjectOutput, error) {
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
var _ s3svc.S3SDKClientInterface = (*MockSDKClient)(nil)

// --- MockTransferManager ---

// MockTransferManager implements s3svc.S3TransferManagerInterface for testing.
type MockTransferManager struct {
	UploadObjectFunc func(ctx context.Context, params *transfermanager.UploadObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error)
	GetObjectFunc    func(ctx context.Context, params *transfermanager.GetObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error)
}

func (m *MockTransferManager) UploadObject(ctx context.Context, params *transfermanager.UploadObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error) {
	if m.UploadObjectFunc != nil {
		return m.UploadObjectFunc(ctx, params, optFns...)
	}
	// Drain body to simulate upload.
	_, _ = io.Copy(io.Discard, params.Body)
	return &transfermanager.UploadObjectOutput{}, nil
}

func (m *MockTransferManager) GetObject(ctx context.Context, params *transfermanager.GetObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error) {
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
var _ s3svc.S3TransferManagerInterface = (*MockTransferManager)(nil)
